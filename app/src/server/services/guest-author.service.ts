import { prisma } from "@/lib/prisma";

const GUEST_SYSTEM_EMAIL = "guest.system@townpet.local";
const GUEST_SYSTEM_NAME = "Guest System";

export async function getOrCreateGuestSystemUserId() {
  const existing = await prisma.user.findUnique({
    where: { email: GUEST_SYSTEM_EMAIL },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      email: GUEST_SYSTEM_EMAIL,
      name: GUEST_SYSTEM_NAME,
    },
    select: { id: true },
  });

  return created.id;
}
