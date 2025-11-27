
import {
  Layout, 
  Page, 
  Button, 
  BlockStack, 
  Card, 
  Text, 
  TextField, 
  Spinner, 
  Banner, 
  Link, 
  EmptyState
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { processOrderHybrid } from "./services/geminiService";
import { QuoteItem, CatalogItem, SavedQuote } from "./types";
import { QuoteItemRow } from "./components/QuoteItemRow";
import { FileUploader } from "./components/FileUploader";
import { ExportModal } from "./components/ExportModal";
import { LearningModal } from "./components/LearningModal";
import { SettingsModal } from "./components/SettingsModal";
import { CatalogManagerModal } from "./components/CatalogManagerModal";
import { HistoryModal } from "./components/HistoryModal";
import { getHistory, addQuoteToHistory, deleteQuoteFromHistory } from "./services/historyService";
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [orderText, setOrderText] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [history, setHistory] = useState<SavedQuote[]>([]);

  // Load catalog from local storage or default
  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const savedCatalog = localStorage.getItem('productCatalog');
    if (savedCatalog) {
      return JSON.parse(savedCatalog);
    }
    // Default/initial catalog if nothing is saved
    return [
      { id: '1', description: 'FIO FLEXÍVEL 2,5MM PT 100M', price: 120.00 },
      { id: '2', description: 'FIO FLEXÍVEL 4MM VM 100M', price: 230.00 },
      { id: '3', description: 'LUMINÁRIA LED SLIM 18W BIVOLT', price: 45.00 },
    ];
  });

  const totalValue = quoteItems.reduce((acc, item) => acc + (item.quantity * (item.catalogItem?.price || 0)), 0);

  const handleSubmit = useCallback(async () => {
    if (!orderText.trim()) {
      setError("Por favor, insira um pedido.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuoteItems([]); // Clear previous results

    try {
      const result = await processOrderHybrid(catalog, orderText);
      setQuoteItems(result.items);

    } catch (err: any) {
      console.error(err); // Log the full error
      setError(`Ocorreu um erro ao processar o pedido. Tente novamente. Detalhes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [orderText, catalog]);

  const handleUpdateItem = (id: string, updatedItem: QuoteItem) => {
    setQuoteItems(quoteItems.map(item => item.id === id ? updatedItem : item));
  };

  const handleRemoveItem = (id: string) => {
    setQuoteItems(quoteItems.filter(item => item.id !== id));
  };

  const handleOpenHistory = () => {
    setHistory(getHistory());
    setIsHistoryModalOpen(true);
  };

  const handleRestoreFromHistory = (quote: SavedQuote) => {
    setQuoteItems(quote.items);
    setIsHistoryModalOpen(false);
  };

  const handleDeleteFromHistory = (id: string) => {
    deleteQuoteFromHistory(id);
    setHistory(getHistory()); // Refresh history
  }

  return (
    <Page fullWidth title="Assistente de Orçamentos KF Elétrica">
      <Layout>
        
        {/* Header Actions */}
        <Layout.Section>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button onClick={handleOpenHistory}>Histórico</Button>
            <Button onClick={() => setIsCatalogModalOpen(true)}>Catálogo</Button>
            <Button onClick={() => setIsLearningModalOpen(true)}>Aprender</Button>
            <Button onClick={() => setIsSettingsModalOpen(true)}>Configurações</Button>
          </div>
        </Layout.Section>

        {/* Main Input Area */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">1. Cole o pedido do cliente</Text>
              <FileUploader onTextRead={setOrderText} />
              <TextField
                label="Ou insira o texto do pedido:"
                value={orderText}
                onChange={setOrderText}
                multiline={6}
                autoComplete="off"
                placeholder="Ex: 150m de fio 2.5mm\n10 tomadas 20A Tramontina Liz\n2 caixas de disjuntores..."
              />
              <Button onClick={handleSubmit} loading={isLoading} variant="primary" size="large" fullWidth>
                Processar Pedido
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Results Area */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">2. Revise e ajuste o resultado</Text>
              
              {error && <Banner tone="critical">{error}</Banner>}
              
              {isLoading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner accessibilityLabel="Processando pedido" size="large" />
                  <Text as="p" variant="bodyMd">Analisando pedido...</Text>
                </div>
              )}

              {!isLoading && quoteItems.length === 0 && !error && (
                  <EmptyState
                    heading="Nenhum item processado ainda"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Cole um pedido acima e clique em "Processar Pedido" para ver a mágica acontecer.</p>
                  </EmptyState>
              )}

              {quoteItems.length > 0 && (
                <BlockStack gap="200">
                  {quoteItems.map(item => (
                    <QuoteItemRow 
                      key={item.id}
                      item={item} 
                      catalog={catalog} 
                      onUpdate={handleUpdateItem} 
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </BlockStack>
              )}

              {quoteItems.length > 0 && (
                <div style={{paddingTop: '1rem'}}>
                    <Button onClick={() => setIsExportModalOpen(true)} variant="primary">
                      Exportar Orçamento (PDF/Texto)
                    </Button>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Footer */}
        <Layout.Section>
          <div style={{textAlign: 'center', color: '#888'}}>
            <Text as="p" variant="bodySm">
              Assistente de Orçamentos v2.0 - 
              <Link url="https://github.com/KauanFraga/pedidos" target="_blank">Ver no GitHub</Link>
            </Text>
          </div>
        </Layout.Section>

      </Layout>

      {/* Modals */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        items={quoteItems} 
        totalValue={totalValue}
      />
      <LearningModal 
        isOpen={isLearningModalOpen} 
        onClose={() => setIsLearningModalOpen(false)} 
      />
       <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      <CatalogManagerModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalog={catalog}
        setCatalog={setCatalog}
      />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onDelete={handleDeleteFromHistory}
        onRestore={handleRestoreFromHistory}
      />

    </Page>
  );
}

export default App;
