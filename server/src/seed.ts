import { prisma } from './db.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export async function seed() {
  console.log('Seeding database...');
  for (const m of ['quizResponse','quizAttempt','userProgress','certificate','notification','assignment','question','assessment','video','trainingModule','auditLog','user']) {
    await (prisma as any)[m].deleteMany();
  }
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin = await prisma.user.create({ data: { email: 'admin@acme.com', passwordHash: hash('Admin@123'), fullName: 'Avery Admin', role: 'admin', department: 'L&D' } });
  const manager = await prisma.user.create({ data: { email: 'manager@acme.com', passwordHash: hash('Manager@123'), fullName: 'Morgan Manager', role: 'manager', department: 'Engineering' } });
  const learner = await prisma.user.create({ data: { email: 'learner@acme.com', passwordHash: hash('Learner@123'), fullName: 'Lee Learner', role: 'learner', department: 'Engineering', managerId: manager.id } });
  const learner2 = await prisma.user.create({ data: { email: 'sam@acme.com', passwordHash: hash('Learner@123'), fullName: 'Sam Rivera', role: 'learner', department: 'Engineering', managerId: manager.id } });

  const mod1 = await prisma.trainingModule.create({ data: { title: 'Information Security Awareness', description: 'Core security hygiene every employee must know: phishing, passwords, data handling, and incident reporting. Required annually for compliance.', category: 'Security & Compliance', isMandatory: true, passThreshold: 70, validityDays: 365, status: 'published', createdById: admin.id } });
  await prisma.video.create({ data: { moduleId: mod1.id, title: 'Security Fundamentals', orderIndex: 0, durationSeconds: 15, sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', binSizeSeconds: 1 } });
  const assess1 = await prisma.assessment.create({ data: { moduleId: mod1.id, title: 'Security Awareness Knowledge Check', passingScore: 70, maxAttempts: 3, showAnswers: true } });
  await prisma.question.createMany({ data: [
    { assessmentId: assess1.id, type: 'mcq', orderIndex: 0, points: 1, prompt: 'You receive an urgent email from "IT Support" asking you to verify your password via a link. What is the BEST action?', explanation: 'Never enter credentials via emailed links. Report suspected phishing to your security team.', optionsJson: JSON.stringify([{ id: 'a', label: 'Click the link and enter your password to be safe', isCorrect: false }, { id: 'b', label: 'Reply with your password so they can fix it faster', isCorrect: false }, { id: 'c', label: 'Report it as phishing and do not click the link', isCorrect: true }, { id: 'd', label: 'Forward it to all colleagues as a warning', isCorrect: false }]) },
    { assessmentId: assess1.id, type: 'multi_select', orderIndex: 1, points: 1, prompt: 'Which of the following are characteristics of a STRONG password? (Select all that apply)', explanation: 'Strong passwords are long, unique per account, and avoid personal/dictionary words.', optionsJson: JSON.stringify([{ id: 'a', label: 'At least 12 characters long', isCorrect: true }, { id: 'b', label: 'Unique to each account', isCorrect: true }, { id: 'c', label: "Your pet's name and birth year", isCorrect: false }, { id: 'd', label: 'A mix of upper, lower, numbers and symbols', isCorrect: true }]) },
    { assessmentId: assess1.id, type: 'true_false', orderIndex: 2, points: 1, prompt: 'It is acceptable to reuse your corporate password on personal websites as long as you trust them.', explanation: 'Password reuse means one breach compromises multiple accounts. Always use unique passwords.', optionsJson: JSON.stringify([{ id: 'true', label: 'True', isCorrect: false }, { id: 'false', label: 'False', isCorrect: true }]) },
    { assessmentId: assess1.id, type: 'short_answer', orderIndex: 3, points: 1, prompt: 'In one or two words, what type of attack uses deceptive emails to trick you into revealing information?', explanation: 'Phishing is the use of fraudulent communications to steal sensitive data.', answerKeyJson: JSON.stringify({ matchType: 'keyword', value: 'phishing', caseSensitive: false }) },
  ] });

  const mod2 = await prisma.trainingModule.create({ data: { title: 'Code of Conduct & Ethics', description: 'Company values, conflicts of interest, anti-bribery, and how to raise concerns. Mandatory for all staff.', category: 'Compliance', isMandatory: true, passThreshold: 80, validityDays: 365, status: 'published', createdById: admin.id } });
  await prisma.video.create({ data: { moduleId: mod2.id, title: 'Our Code of Conduct', orderIndex: 0, durationSeconds: 15, sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', binSizeSeconds: 1 } });
  const assess2 = await prisma.assessment.create({ data: { moduleId: mod2.id, title: 'Code of Conduct Quiz', passingScore: 80, maxAttempts: 3, showAnswers: true } });
  await prisma.question.createMany({ data: [
    { assessmentId: assess2.id, type: 'mcq', orderIndex: 0, points: 1, prompt: 'A supplier offers you concert tickets shortly before a contract decision. What should you do?', explanation: 'Gifts that could influence business decisions must be declined and disclosed.', optionsJson: JSON.stringify([{ id: 'a', label: 'Accept them — it would be rude to refuse', isCorrect: false }, { id: 'b', label: 'Decline and disclose the offer per policy', isCorrect: true }, { id: 'c', label: 'Accept but give them to a friend', isCorrect: false }, { id: 'd', label: 'Accept and award the contract', isCorrect: false }]) },
    { assessmentId: assess2.id, type: 'true_false', orderIndex: 1, points: 1, prompt: 'You can raise an ethics concern anonymously through the company hotline.', explanation: 'Most codes of conduct guarantee anonymous, retaliation-free reporting channels.', optionsJson: JSON.stringify([{ id: 'true', label: 'True', isCorrect: true }, { id: 'false', label: 'False', isCorrect: false }]) },
  ] });

  const due = new Date(); due.setDate(due.getDate() + 14);
  const dueSoon = new Date(); dueSoon.setDate(dueSoon.getDate() + 2);
  for (const u of [learner, learner2]) {
    await prisma.assignment.create({ data: { userId: u.id, moduleId: mod1.id, assignedById: admin.id, dueAt: dueSoon, status: 'assigned' } });
    await prisma.assignment.create({ data: { userId: u.id, moduleId: mod2.id, assignedById: admin.id, dueAt: due, status: 'assigned' } });
  }
  await prisma.notification.create({ data: { userId: learner.id, type: 'assignment', title: 'New training assigned', body: 'Information Security Awareness is due in 2 days.' } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: 'seed.bootstrap', entityType: 'system', metaJson: JSON.stringify({ modules: 2 }) } });
  console.log('Seed complete. Logins: admin@acme.com/Admin@123 · manager@acme.com/Manager@123 · learner@acme.com/Learner@123');
}

// allow `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed().then(() => process.exit(0));
}
