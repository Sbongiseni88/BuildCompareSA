export type UserRole = 'contractor' | 'supplier';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole | null;
    createdAt: Date | null;
}
