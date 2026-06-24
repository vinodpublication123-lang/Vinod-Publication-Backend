import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { slugify } from "../../lib/slugify";
import { CreateProductInput, UpdateProductInput, ProductQuery } from "./products.schemas";

// ── helpers ───────────────────────────────────────────────────────────────────

async function resolveUniqueSlug(
  base: string,
  table: "product" | "author" | "book"
): Promise<string> {
  const slug = slugify(base);
  let candidate = slug;
  let i = 1;
  while (true) {
    let found: { id: string } | null = null;
    if (table === "product") found = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    else if (table === "author") found = await prisma.author.findUnique({ where: { slug: candidate }, select: { id: true } });
    else found = await prisma.book.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!found) return candidate;
    candidate = `${slug}-${i++}`;
  }
}

// ── Public list / single ──────────────────────────────────────────────────────

export async function listProducts(query: ProductQuery) {
  const { page, limit, search, category, status, sort, order } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    ...(category && { category }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        sizes: true,
        book: { include: { author: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sizes: true,
      book: { include: { author: true } },
    },
  });
  if (!product) throw new AppError("Product not found", 404);
  return product;
}

// ── Create product (+ book + author if BOOK category) ────────────────────────

export async function createProduct(input: CreateProductInput) {
  const productSlug = await resolveUniqueSlug(input.name, "product");

  return prisma.$transaction(async (tx) => {
    // 1. Resolve or create Author (only for BOOK)
    let authorId: string | undefined;
    if (input.category === "BOOK" && input.book) {
      const { author: authorInput, ...bookData } = input.book;

      // Check for existing author by name (case-insensitive)
      let author = await tx.author.findFirst({
        where: { name: { equals: authorInput.name, mode: "insensitive" } },
        select: { id: true },
      });

      if (!author) {
        const authorSlug = await resolveUniqueSlug(authorInput.name, "author");
        author = await tx.author.create({
          data: {
            name: authorInput.name,
            slug: authorSlug,
            shortBio: authorInput.shortBio,
            fullBio: authorInput.fullBio,
            avatarUrl: authorInput.avatarUrl,
            status: "ACTIVE",
          },
          select: { id: true },
        });
      }

      authorId = author.id;

      // 2. Create Product
      const product = await tx.product.create({
        data: {
          name: input.name,
          slug: productSlug,
          sku: input.sku,
          brand: input.brand,
          category: input.category,
          status: input.status ?? "DRAFT",
          price: input.price,
          salePrice: input.salePrice ?? null,
          tax: input.tax ?? 0,
          trackStock: input.trackStock ?? true,
          globalStock: input.globalStock ?? 0,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          outOfStockBehavior: input.outOfStockBehavior ?? "SHOW_AS_OUT_OF_STOCK",
          primaryImage: input.primaryImage ?? null,
          galleryImages: input.galleryImages ?? [],
          sizes: {
            create: (input.sizes ?? []).map((s) => ({
              label: s.label,
              stock: s.stock,
            })),
          },
        },
        select: { id: true },
      });

      // 3. Create Book and link to Product + Author
      const bookSlug = await resolveUniqueSlug(bookData.title, "book");
      const fullBook = await tx.book.create({
        data: {
          title: bookData.title,
          slug: bookSlug,
          genre: bookData.genre,
          publicationDate: bookData.publicationDate,
          shortDescription: bookData.shortDescription,
          fullDescription: bookData.fullDescription,
          coverUrl: bookData.coverUrl,
          qrEnabled: bookData.qrEnabled ?? false,
          qrSongTitle: bookData.qrSongTitle,
          qrSongUrl: bookData.qrSongUrl,
          authorId,
          productId: product.id,
        },
      });

      // Return full product with relations
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          sizes: true,
          book: { include: { author: true } },
        },
      });
    } else {
      // Non-BOOK product — straightforward
      return tx.product.create({
        data: {
          name: input.name,
          slug: productSlug,
          sku: input.sku,
          brand: input.brand,
          category: input.category,
          status: input.status ?? "DRAFT",
          price: input.price,
          salePrice: input.salePrice ?? null,
          tax: input.tax ?? 0,
          trackStock: input.trackStock ?? true,
          globalStock: input.globalStock ?? 0,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          outOfStockBehavior: input.outOfStockBehavior ?? "SHOW_AS_OUT_OF_STOCK",
          primaryImage: input.primaryImage ?? null,
          galleryImages: input.galleryImages ?? [],
          sizes: {
            create: (input.sizes ?? []).map((s) => ({
              label: s.label,
              stock: s.stock,
            })),
          },
        },
        include: {
          sizes: true,
          book: { include: { author: true } },
        },
      });
    }
  });
}

// ── Update product ────────────────────────────────────────────────────────────

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError("Product not found", 404);

  const { sizes, book, ...productData } = input;

  return prisma.$transaction(async (tx) => {
    // Update sizes if provided
    if (sizes !== undefined) {
      await tx.productSize.deleteMany({ where: { productId: id } });
      await tx.productSize.createMany({
        data: sizes.map((s) => ({ productId: id, label: s.label, stock: s.stock })),
      });
    }

    // Update book data if provided
    if (book !== undefined) {
      const existingBook = await tx.book.findUnique({
        where: { productId: id },
        select: { id: true, authorId: true },
      });
      
      const { author: authorInput, ...bookData } = book;
      
      let finalAuthorId: string | undefined;

      // Handle author update/reuse/creation
      if (authorInput) {
        let author = await tx.author.findFirst({
          where: { name: { equals: authorInput.name, mode: "insensitive" } },
          select: { id: true },
        });
        if (!author) {
          const authorSlug = await resolveUniqueSlug(authorInput.name, "author");
          author = await tx.author.create({
            data: {
              name: authorInput.name,
              slug: authorSlug,
              shortBio: authorInput.shortBio,
              fullBio: authorInput.fullBio,
              avatarUrl: authorInput.avatarUrl,
              status: "ACTIVE",
            },
            select: { id: true },
          });
        }
        finalAuthorId = author.id;
      }

      if (existingBook) {
        // Update existing book
        await tx.book.update({
          where: { id: existingBook.id },
          data: { ...bookData, ...(finalAuthorId && { authorId: finalAuthorId }) },
        });
      } else if (finalAuthorId) {
        // Create new book (e.g., product category changed to BOOK)
        const bookSlug = await resolveUniqueSlug(bookData.title, "book");
        await tx.book.create({
          data: {
            title: bookData.title,
            slug: bookSlug,
            genre: bookData.genre,
            publicationDate: bookData.publicationDate,
            shortDescription: bookData.shortDescription,
            fullDescription: bookData.fullDescription,
            coverUrl: bookData.coverUrl,
            qrEnabled: bookData.qrEnabled ?? false,
            qrSongTitle: bookData.qrSongTitle,
            qrSongUrl: bookData.qrSongUrl,
            authorId: finalAuthorId,
            productId: id,
          },
        });
      }
    }

    return tx.product.update({
      where: { id },
      data: productData as Prisma.ProductUpdateInput,
      include: {
        sizes: true,
        book: { include: { author: true } },
      },
    });
  });
}

// ── Delete product ────────────────────────────────────────────────────────────

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError("Product not found", 404);
  await prisma.product.delete({ where: { id } });
}
