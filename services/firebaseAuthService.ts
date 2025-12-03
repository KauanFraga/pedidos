// services/firebaseAuthService.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const registerUser = async (email: string, password: string, displayName: string): Promise<AuthUser> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Atualizar nome do usuário
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: displayName
    };
  } catch (error: any) {
    console.error("Erro ao registrar:", error);
    throw new Error(getErrorMessage(error.code));
  }
};

export const loginUser = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName
    };
  } catch (error: any) {
    console.error("Erro ao fazer login:", error);
    throw new Error(getErrorMessage(error.code));
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Erro ao fazer logout:", error);
    throw new Error("Erro ao sair da conta");
  }
};

export const onAuthChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
    } else {
      callback(null);
    }
  });
};

const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este email já está cadastrado';
    case 'auth/invalid-email':
      return 'Email inválido';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida';
    case 'auth/weak-password':
      return 'Senha muito fraca. Use no mínimo 6 caracteres';
    case 'auth/user-disabled':
      return 'Usuário desabilitado';
    case 'auth/user-not-found':
      return 'Usuário não encontrado';
    case 'auth/wrong-password':
      return 'Senha incorreta';
    case 'auth/invalid-credential':
      return 'Email ou senha incorretos';
    default:
      return 'Erro ao autenticar. Tente novamente';
  }
};
