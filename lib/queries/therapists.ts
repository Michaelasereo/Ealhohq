import { prisma } from "@/lib/prisma/client";

export async function getApprovedTherapists() {
  return prisma.therapyTherapist.findMany({
    where: { status: "approved" },
    include: {
      profile: {
        select: { fullName: true },
      },
      availabilitySchedule: {
        where: { isActive: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTherapistById(
  id: string,
  options?: { approvedOnly?: boolean },
) {
  return prisma.therapyTherapist.findFirst({
    where: {
      id,
      ...(options?.approvedOnly ? { status: "approved" } : {}),
    },
    include: {
      profile: {
        select: { fullName: true },
      },
      availabilitySchedule: {
        where: { isActive: true },
      },
      availabilityOverrides: {
        where: {
          date: { gte: new Date() },
        },
      },
    },
  });
}
