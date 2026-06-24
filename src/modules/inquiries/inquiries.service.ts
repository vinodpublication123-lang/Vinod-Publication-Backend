import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { CreateInquiryInput, UpdateInquiryInput, InquiryQuery } from "./inquiries.schemas";

export async function createInquiry(input: CreateInquiryInput) {
  return prisma.inquiry.create({
    data: {
      ...input,
      metadata: input.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });
}


export async function listInquiries(query: InquiryQuery) {
  const { page, limit, type, status, sort, order } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.InquiryWhereInput = {
    ...(type && { type }),
    ...(status && { status }),
  };

  const [total, items] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
    }),
  ]);

  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getInquiryById(id: string) {
  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) throw new AppError("Inquiry not found", 404);
  return inquiry;
}

export async function updateInquiry(id: string, input: UpdateInquiryInput) {
  const existing = await prisma.inquiry.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError("Inquiry not found", 404);
  return prisma.inquiry.update({ where: { id }, data: input });
}
