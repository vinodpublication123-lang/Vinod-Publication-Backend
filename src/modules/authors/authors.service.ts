import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { slugify } from "../../lib/slugify";
import { UpdateAuthorInput, AuthorQuery } from "./authors.schemas";

export async function listAuthors(query: AuthorQuery) {
  const { page, limit, search, status, sort, order } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AuthorWhereInput = {
    ...(status && { status }),
    ...(search && {
      name: { contains: search, mode: "insensitive" },
    }),
  };

  const [total, items] = await Promise.all([
    prisma.author.count({ where }),
    prisma.author.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        books: {
          select: { id: true, title: true, slug: true },
        },
      },
    }),
  ]);

  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getAuthorById(id: string) {
  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      books: {
        include: {
          product: { select: { id: true, name: true, slug: true, price: true, status: true } },
        },
      },
    },
  });
  if (!author) throw new AppError("Author not found", 404);
  return author;
}

export async function updateAuthor(id: string, input: UpdateAuthorInput) {
  const existing = await prisma.author.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError("Author not found", 404);

  // If name is changing, update slug too
  const data: Prisma.AuthorUpdateInput = { ...input };
  if (input.name) {
    const slug = slugify(input.name);
    // Ensure new slug is unique (skip current record)
    const conflict = await prisma.author.findFirst({
      where: { slug, NOT: { id } },
      select: { id: true },
    });
    data.slug = conflict ? `${slug}-${Date.now()}` : slug;
  }

  return prisma.author.update({
    where: { id },
    data,
    include: { books: { select: { id: true, title: true } } },
  });
}

export async function deleteAuthor(id: string) {
  const author = await prisma.author.findUnique({
    where: { id },
    include: { books: { select: { id: true } } },
  });
  if (!author) throw new AppError("Author not found", 404);

  if (author.books.length > 0) {
    throw new AppError(
      "Cannot delete an author with associated books. Delete all books first.",
      409
    );
  }

  await prisma.author.delete({ where: { id } });
}
