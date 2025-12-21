// services/firebaseAuthService.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from "../firebase";
import { CatalogItem, SavedQuote, LearnedMatch } from '../types';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface FirestoreSyncData {
  catalogo: {
    items: CatalogItem[];
    catalogDate: string | null;
  };
  orcamentos: SavedQuote[];
  aprendizado: LearnedMatch[];
  ultimaAtualizacao: any;
}

// ==================== AUTENTICAÇÃO ====================

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

// ==================== SINCRONIZAÇÃO FIRESTORE ====================

export const sincronizarTudo = async (
  userId: string,
  dados: {
    catalogo: CatalogItem[];
    catalogDate: string | null;
    orcamentos: SavedQuote[];
    aprendizado: LearnedMatch[];
  }
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, `users/${userId}/data/sync`);
    
    const syncData: FirestoreSyncData = {
      catalogo: {
        items: dados.catalogo,
        catalogDate: dados.catalogDate
      },
      orcamentos: dados.orcamentos,
      aprendizado: dados.aprendizado,
      ultimaAtualizacao: serverTimestamp()
    };

    await setDoc(userDocRef, syncData);
    console.log('✅ Dados sincronizados com sucesso no Firestore!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);
    return false;
  }
};

export const carregarDadosSync = async (userId: string): Promise<{
  catalogo: CatalogItem[];
  catalogDate: string | null;
  orcamentos: SavedQuote[];
  aprendizado: LearnedMatch[];
} | null> => {
  try {
    const userDocRef = doc(db, `users/${userId}/data/sync`);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreSyncData;
      console.log('✅ Dados carregados do Firestore!');
      
      return {
        catalogo: data.catalogo?.items || [],
        catalogDate: data.catalogo?.catalogDate || null,
        orcamentos: data.orcamentos || [],
        aprendizado: data.aprendizado || []
      };
    } else {
      console.log('ℹ️ Nenhum dado encontrado no Firestore');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    return null;
  }
};

export const sincronizarCatalogo = async (
  userId: string,
  catalogo: CatalogItem[],
  catalogDate: string | null
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, `users/${userId}/data/sync`);
    
    await setDoc(userDocRef, {
      catalogo: {
        items: catalogo,
        catalogDate: catalogDate
      },
      ultimaAtualizacao: serverTimestamp()
    }, { merge: true });

    console.log('✅ Catálogo sincronizado!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar catálogo:', error);
    return false;
  }
};

export const sincronizarOrcamentos = async (
  userId: string,
  orcamentos: SavedQuote[]
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, `users/${userId}/data/sync`);
    
    await setDoc(userDocRef, {
      orcamentos: orcamentos,
      ultimaAtualizacao: serverTimestamp()
    }, { merge: true });

    console.log('✅ Orçamentos sincronizados!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar orçamentos:', error);
    return false;
  }
};

export const sincronizarAprendizado = async (
  userId: string,
  aprendizado: LearnedMatch[]
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, `users/${userId}/data/sync`);
    
    await setDoc(userDocRef, {
      aprendizado: aprendizado,
      ultimaAtualizacao: serverTimestamp()
    }, { merge: true });

    console.log('✅ Aprendizado sincronizado!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar aprendizado:', error);
    return false;
  }
};

export const criarBackupFirestore = async (userId: string): Promise<string | null> => {
  try {
    const dados = await carregarDadosSync(userId);
    if (!dados) return null;

    const backup = JSON.stringify({
      ...dados,
      dataBackup: new Date().toISOString(),
      versao: '2.0',
      usuario: userId
    }, null, 2);

    console.log('✅ Backup criado com sucesso!');
    return backup;
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    return null;
  }
};