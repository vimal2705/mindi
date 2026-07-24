import { PrismaClient } from '@prisma/client';
import { authService } from '../src/services/AuthService.js';
import { roomService } from '../src/services/RoomService.js';
import { GamePhase } from '@mindi-coat/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Mindi Coat database...');

  await prisma.matchHistory.deleteMany();
  await prisma.reconnectSession.deleteMany();
  await prisma.score.deleteMany();
  await prisma.round.deleteMany();
  await prisma.game.deleteMany();
  await prisma.player.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: { username: 'alice', displayName: 'Alice', avatar: '👑', isGuest: false },
    }),
    prisma.user.create({
      data: { username: 'bob', displayName: 'Bob', avatar: '🎯', isGuest: false },
    }),
    prisma.user.create({
      data: { username: 'carol', displayName: 'Carol', avatar: '🔥', isGuest: false },
    }),
    prisma.user.create({
      data: { username: 'dave', displayName: 'Dave', avatar: '⚡', isGuest: false },
    }),
  ]);

  console.log(`Created ${users.length} example users`);

  const guest = await authService.guestLogin('Demo Guest');
  console.log(`Guest token created for: ${guest.user.displayName}`);

  const room = await roomService.createRoom(users[0].id, 'Demo Room', {
    visibility: 'PUBLIC' as import('@mindi-coat/shared').RoomVisibility,
  });

  for (let i = 1; i < 4; i++) {
    await roomService.joinRoom(users[i].id, room.code);
  }

  room.players.forEach((p) => {
    p.isReady = true;
  });

  console.log(`Demo room created: ${room.code} (${room.players.length}/4 players ready)`);
  console.log(`Invite link: ${room.toRoomStateDTO().inviteLink}`);
  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
