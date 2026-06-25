import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const editorHash = await bcrypt.hash('editor123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'akmal@eyelevelstudio.in' },
    update: {},
    create: { name: 'Akmal Rahman', email: 'akmal@eyelevelstudio.in', password: adminHash, role: 'ADMIN' },
  });

  const dilshad = await prisma.user.upsert({
    where: { email: 'dilshad@eyelevelstudio.in' },
    update: {},
    create: { name: 'Dilshad K', email: 'dilshad@eyelevelstudio.in', password: editorHash, role: 'EDITOR' },
  });

  const janani = await prisma.user.upsert({
    where: { email: 'janani@eyelevelstudio.in' },
    update: {},
    create: { name: 'Janani S', email: 'janani@eyelevelstudio.in', password: editorHash, role: 'EDITOR' },
  });

  const tanuja = await prisma.user.upsert({
    where: { email: 'tanuja@eyelevelstudio.in' },
    update: {},
    create: { name: 'Tanuja R', email: 'tanuja@eyelevelstudio.in', password: editorHash, role: 'EDITOR' },
  });

  // Clients
  const rightHospitals = await prisma.client.upsert({
    where: { slug: 'right-hospitals' },
    update: {},
    create: { name: 'Right Hospitals', slug: 'right-hospitals', color: '#3b82f6', platforms: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] },
  });

  const heavensElix = await prisma.client.upsert({
    where: { slug: 'heavens-elix' },
    update: {},
    create: { name: "Heaven's ELIX", slug: 'heavens-elix', color: '#8b5cf6', platforms: ['INSTAGRAM', 'FACEBOOK'] },
  });

  const tnpa = await prisma.client.upsert({
    where: { slug: 'tnpa' },
    update: {},
    create: { name: 'TNPA', slug: 'tnpa', color: '#f59e0b', platforms: ['INSTAGRAM', 'FACEBOOK', 'TWITTER'] },
  });

  const daOneSports = await prisma.client.upsert({
    where: { slug: 'da-one-sports' },
    update: {},
    create: { name: 'Da One Sports', slug: 'da-one-sports', color: '#ef4444', platforms: ['INSTAGRAM', 'YOUTUBE'] },
  });

  // Posts for Right Hospitals
  const rh1 = await prisma.post.create({
    data: {
      title: 'Weekly health tips — diabetes awareness carousel',
      caption: '5 early signs of diabetes you should never ignore. Swipe to know more.\n\n1. Frequent urination\n2. Unusual thirst\n3. Blurred vision\n4. Slow-healing wounds\n5. Fatigue you cannot explain\n\nYour health is your wealth. Book a consultation at Right Hospitals today.',
      hashtags: ['#DiabetesAwareness', '#RightHospitals', '#HealthTips', '#Chennai'],
      platforms: ['INSTAGRAM', 'FACEBOOK'],
      contentType: 'CAROUSEL',
      category: 'Educational',
      status: 'REVIEW',
      clientId: rightHospitals.id,
      assignedToId: janani.id,
      createdById: admin.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: rh1.id, label: 'Copy approved by Dr. Kavya', order: 0 },
      { postId: rh1.id, label: 'Carousel creatives designed (5 slides)', order: 1, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: rh1.id, label: 'CTA and booking link verified', order: 2 },
      { postId: rh1.id, label: 'Hashtag research done', order: 3, completed: true, completedAt: new Date(), completedById: dilshad.id },
      { postId: rh1.id, label: 'Final review by Akmal', order: 4 },
    ],
  });

  await prisma.comment.create({
    data: {
      postId: rh1.id,
      userId: janani.id,
      body: 'Creatives are done, uploaded to Drive. Waiting on Dr. Kavya to approve the copy before we move to Approved.',
    },
  });

  const rh2 = await prisma.post.create({
    data: {
      title: 'Doctor spotlight — Dr. Kavya Somesh, Endocrinologist',
      caption: "Meet the doctor behind your health journey.\n\nDr. Kavya Somesh brings 12 years of endocrinology expertise to Right Hospitals. Whether it's diabetes management, thyroid care, or hormonal health — she's your partner in long-term wellness.\n\nBook now via the link in bio.",
      hashtags: ['#RightHospitals', '#DoctorSpotlight', '#Endocrinology'],
      platforms: ['LINKEDIN', 'INSTAGRAM'],
      contentType: 'STATIC_IMAGE',
      category: 'Educational',
      status: 'APPROVED',
      clientId: rightHospitals.id,
      assignedToId: dilshad.id,
      createdById: admin.id,
      scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: rh2.id, label: 'Doctor headshot collected', order: 0, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: rh2.id, label: 'Bio approved by doctor', order: 1, completed: true, completedAt: new Date(), completedById: admin.id },
      { postId: rh2.id, label: 'Graphic designed and uploaded', order: 2, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: rh2.id, label: 'Scheduled in buffer', order: 3 },
    ],
  });

  const rh3 = await prisma.post.create({
    data: {
      title: 'Patient success story — knee replacement recovery',
      caption: '',
      hashtags: [],
      platforms: ['FACEBOOK', 'INSTAGRAM'],
      contentType: 'STATIC_IMAGE',
      category: 'Community',
      status: 'IDEA',
      clientId: rightHospitals.id,
      assignedToId: tanuja.id,
      createdById: admin.id,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: rh3.id, label: 'Get written consent from patient', order: 0 },
      { postId: rh3.id, label: 'Interview patient for quote', order: 1 },
      { postId: rh3.id, label: 'Before/after photos collected', order: 2 },
      { postId: rh3.id, label: 'Write copy', order: 3 },
    ],
  });

  // Posts for Heaven's ELIX
  const elix1 = await prisma.post.create({
    data: {
      title: "Founder story reel — why Priya started Heaven's ELIX",
      caption: "I quit my corporate job to brew kombucha. Here's why.\n\nMost people thought I was crazy. My family did too.\n\nBut I had a gut feeling (literally). After years of digestive issues, a friend introduced me to kombucha. Three weeks later — no bloating. No cramps. Just energy.\n\nI spent 14 months perfecting the formula before I launched Heaven's ELIX.\n\nThis is why it exists. This is why I wake up at 5am to brew every single batch.\n\nYour gut deserves better.",
      hashtags: ['#HeavensElix', '#Kombucha', '#FounderStory', '#GutHealth'],
      platforms: ['INSTAGRAM'],
      contentType: 'REEL',
      category: 'Behind-the-Scenes',
      status: 'DRAFT',
      clientId: heavensElix.id,
      assignedToId: janani.id,
      createdById: admin.id,
      scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: elix1.id, label: 'Script written and sent to founder', order: 0, completed: true, completedAt: new Date(), completedById: admin.id },
      { postId: elix1.id, label: 'Reel filmed by founder', order: 1 },
      { postId: elix1.id, label: 'Editing and subtitles', order: 2 },
      { postId: elix1.id, label: 'Hook frame reviewed', order: 3 },
      { postId: elix1.id, label: 'Caption and hashtags finalized', order: 4 },
    ],
  });

  const elix2 = await prisma.post.create({
    data: {
      title: 'Product launch post — new flavour: Ginger Lemon',
      caption: 'New drop. Ginger Lemon is here.\n\nTangy. Spicy. Gut-loving.\n\nCrafted with real ginger root and Amalfi lemon extract. Zero sugar. Full flavour.\n\nLink in bio. Limited first batch.',
      hashtags: ['#HeavensElix', '#Kombucha', '#NewFlavour', '#GingerLemon'],
      platforms: ['INSTAGRAM', 'FACEBOOK'],
      contentType: 'STATIC_IMAGE',
      category: 'Promotional',
      status: 'PUBLISHED',
      clientId: heavensElix.id,
      assignedToId: janani.id,
      createdById: admin.id,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: elix2.id, label: 'Product photography done', order: 0, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: elix2.id, label: 'Copy approved', order: 1, completed: true, completedAt: new Date(), completedById: admin.id },
      { postId: elix2.id, label: 'Posted live', order: 2, completed: true, completedAt: new Date(), completedById: dilshad.id },
    ],
  });

  // Posts for TNPA
  const tnpa1 = await prisma.post.create({
    data: {
      title: 'TNPPL Season 2 announcement — registration open',
      caption: "Tamil Nadu's biggest pickleball tournament is back.\n\nTNPPL Season 2 | June 24–28, 2026 | Chennai\n\n48 teams. 6 courts. Prize pool of ₹5,00,000.\n\nRegistrations open now. Limited spots.\n\nTag your doubles partner. Let's go.",
      hashtags: ['#TNPPL', '#Pickleball', '#TamilNadu', '#TNPA', '#Season2'],
      platforms: ['INSTAGRAM', 'FACEBOOK', 'TWITTER'],
      contentType: 'STATIC_IMAGE',
      category: 'Announcement',
      status: 'SCHEDULED',
      clientId: tnpa.id,
      assignedToId: dilshad.id,
      createdById: admin.id,
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: tnpa1.id, label: 'Event details confirmed with TNPA', order: 0, completed: true, completedAt: new Date(), completedById: admin.id },
      { postId: tnpa1.id, label: 'Tournament banner designed', order: 1, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: tnpa1.id, label: 'Registration link tested', order: 2, completed: true, completedAt: new Date(), completedById: dilshad.id },
      { postId: tnpa1.id, label: 'Scheduled in posting tool', order: 3, completed: true, completedAt: new Date(), completedById: dilshad.id },
    ],
  });

  await prisma.comment.create({
    data: { postId: tnpa1.id, userId: admin.id, body: 'All good. Scheduled to go out at 6pm today. Make sure someone monitors engagement in the first hour.' },
  });

  const tnpa2 = await prisma.post.create({
    data: {
      title: 'Athlete spotlight — top seed from Season 1',
      caption: '',
      hashtags: [],
      platforms: ['INSTAGRAM', 'TWITTER'],
      contentType: 'STATIC_IMAGE',
      category: 'Community',
      status: 'IDEA',
      clientId: tnpa.id,
      assignedToId: tanuja.id,
      createdById: admin.id,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: tnpa2.id, label: 'Identify top seed from Season 1 records', order: 0 },
      { postId: tnpa2.id, label: 'Collect athlete photo and bio', order: 1 },
      { postId: tnpa2.id, label: 'Write copy', order: 2 },
    ],
  });

  // Posts for Da One Sports
  const daone1 = await prisma.post.create({
    data: {
      title: 'Community update — 500 members milestone',
      caption: "500 athletes. One community.\n\nWhen Da One Sports launched, we had 12 members, one court, and a WhatsApp group.\n\nToday — 500 members, 3 venues, weekly tournaments.\n\nThis is just the beginning.\n\nWelcome to the family.",
      hashtags: ['#DaOneSports', '#Pickleball', '#Community', '#Chennai'],
      platforms: ['INSTAGRAM', 'FACEBOOK'],
      contentType: 'CAROUSEL',
      category: 'Community',
      status: 'REVIEW',
      clientId: daOneSports.id,
      assignedToId: janani.id,
      createdById: admin.id,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: daone1.id, label: 'Confirm milestone number with client', order: 0, completed: true, completedAt: new Date(), completedById: tanuja.id },
      { postId: daone1.id, label: 'Collage of community photos designed', order: 1, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: daone1.id, label: 'Copy reviewed by client', order: 2 },
      { postId: daone1.id, label: 'Final approval from Akmal', order: 3 },
    ],
  });

  await prisma.comment.create({
    data: { postId: daone1.id, userId: dilshad.id, body: "Client loved the copy. Said 'perfect, just go with it'. Waiting on final sign-off from Akmal." },
  });

  const daone2 = await prisma.post.create({
    data: {
      title: 'Tournament recap video — June weekend open',
      caption: 'The weekend open was everything we hoped for.\n\n64 players. 3 days. Unforgettable moments.\n\nWatch the highlights.',
      hashtags: ['#DaOneSports', '#Pickleball', '#TournamentRecap'],
      platforms: ['YOUTUBE', 'INSTAGRAM'],
      contentType: 'VIDEO',
      category: 'Community',
      status: 'DRAFT',
      clientId: daOneSports.id,
      assignedToId: janani.id,
      createdById: admin.id,
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      { postId: daone2.id, label: 'Raw footage received from client', order: 0, completed: true, completedAt: new Date(), completedById: janani.id },
      { postId: daone2.id, label: 'Edited highlight reel (3 min)', order: 1 },
      { postId: daone2.id, label: 'Thumbnail designed', order: 2 },
      { postId: daone2.id, label: 'Caption and tags written', order: 3 },
      { postId: daone2.id, label: 'Uploaded to YouTube as unlisted for review', order: 4 },
    ],
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Admin  — akmal@eyelevelstudio.in  / admin123');
  console.log('  Editor — dilshad@eyelevelstudio.in / editor123');
  console.log('  Editor — janani@eyelevelstudio.in  / editor123');
  console.log('  Editor — tanuja@eyelevelstudio.in  / editor123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
