import '@rainbow-me/rainbowkit/styles.css';
import {
  ConnectButton,
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { zkSyncSepoliaTestnet } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import CardBattleGame from './CardBattle';
const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'CardBattle',
  projectId: 'YOUR_PROJECT_ID',
  chains: [zkSyncSepoliaTestnet],
  ssr: true,
});


function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="min-h-screen flex flex-col">
            <nav className="bg-white shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">Card Battle</h1>
                <ConnectButton />
              </div>
            </nav>
            <main className="flex-grow">
              <CardBattleGame />
            </main>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App;