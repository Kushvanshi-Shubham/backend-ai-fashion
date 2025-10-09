import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: 'email and password required' });
        return;
      }
      const result = await authService.register({ email, password });
      res.json({ success: true, data: result });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: 'email and password required' });
        return;
      }
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  async me(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const user = await authService.me(req.user.sub);
      res.json({ success: true, data: user });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
}
