import Link from 'next/link';
import {AuthCard} from '@/components/auth/auth-card';
import {PasswordRecoveryForm} from '@/components/auth/password-recovery-form';
import {requestPasswordRecovery} from '../recovery/actions';
export default function ForgotPassword(){return <AuthCard title="Recupere seu acesso"><p className="zf-lead">Informe seu e-mail para solicitar um link de redefinição de senha. Abra o link neste mesmo navegador.</p><PasswordRecoveryForm action={requestPasswordRecovery} mode="request"/><Link href="/login" className="zf-link">Voltar ao login</Link></AuthCard>;}
