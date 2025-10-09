import prisma from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface RegisterInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new Error('User already exists');

    const hashed = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({ data: { email: input.email, password: hashed } });
    const token = this.signToken(user.id, user.role);
    return { user: { id: user.id, email: user.email, role: user.role }, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid credentials');

    const token = this.signToken(user.id, user.role);
    return { user: { id: user.id, email: user.email, role: user.role }, token };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, createdAt: true } });
    return user;
  }

  private signToken(id: string, role: any) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    return jwt.sign({ sub: id, role }, secret, { expiresIn: '7d' });
  }
}
