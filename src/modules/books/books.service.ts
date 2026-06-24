import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { UpdateBookInput, BookQuery } from "./books.schemas";

export async function listBooks(query: BookQuery) {
  const { page, limit, search, sort, order } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BookWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { author: { name: { contains: search, mode: "insensitive" } } },
          { genre: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, items] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        author: true,
        product: { select: { id: true, name: true, slug: true, price: true, status: true, primaryImage: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getBookById(id: string) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      author: true,
      product: true,
    },
  });
  if (!book) throw new AppError("Book not found", 404);
  return book;
}

export async function updateBook(id: string, input: UpdateBookInput) {
  const existing = await prisma.book.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError("Book not found", 404);

  return prisma.book.update({
    where: { id },
    data: input,
    include: { author: true, product: { select: { id: true, name: true, slug: true } } },
  });
}

export async function deleteBook(id: string) {
  const existing = await prisma.book.findUnique({
    where: { id },
    select: { id: true, productId: true },
  });
  if (!existing) throw new AppError("Book not found", 404);

  // Deleting the product cascades the book (onDelete: Cascade on Book)
  await prisma.product.delete({ where: { id: existing.productId } });
}
