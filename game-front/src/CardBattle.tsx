import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import {  Address } from 'viem';
import abi from './config/artifacts';

const contractAddress = '0xAb9556c3540C6320621a6Fb49188E14b61d0912E' as const;

enum Stage {
  None,
  Matching,
  Commit,
  Reveal
}

type Card = {
  id: bigint;
  attack: bigint;
  defense: bigint;
  speed: bigint;
};

type Battle = {
  player1: { addr: Address; selectedCardIndex: bigint; commitment: `0x${string}` };
  player2: { addr: Address; selectedCardIndex: bigint; commitment: `0x${string}` };
  stage: Stage;
  deadline: bigint;
};

type BattleResult = {
  winner: Address;
  loser: Address;
  isTie: boolean;
};

const CardBattleGame: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { writeContract } = useWriteContract();

  const { data: playerCards, refetch: refetchPlayerCards } = useReadContract({
      address: contractAddress,
      abi,
      functionName: 'getPlayerCards',
      args: [address as Address],
  }) as unknown as { data: Card[] | undefined, refetch: () => Promise<void> };

  const { data: currentBattle, refetch: refetchCurrentBattle } = useReadContract({
      address: contractAddress,
      abi,
      functionName: 'getCurrentBattle',
  }) as unknown as { data: Battle | null, refetch: () => Promise<void> };

  useEffect(() => {
    if (isConnected && address) {
      checkCards();
    }
  }, [isConnected, address]);

  const checkCards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await refetchPlayerCards();
      await refetchCurrentBattle();
    } catch (error) {
      console.error('Error checking cards:', error);
      setError('Failed to fetch game data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useWatchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'BattleResult',
    onLogs(logs) {
    console.log(logs);
      refetchCurrentBattle();
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'Tie',
    onLogs() {
      setBattleResult({ winner: '0x0' as Address, loser: '0x0' as Address, isTie: true });
      setShowModal(true);
      refetchCurrentBattle();
    },
  });

  const handleEnterGame = async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'enterGame',
      });
      await checkCards();
    } catch (error) {
      console.error('Error entering game:', error);
      setError('Failed to enter the game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitGame = async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'exitGame',
      });
      setSelectedCardIndex(null);
      await checkCards();
    } catch (error) {
      console.error('Error exiting game:', error);
      setError('Failed to exit the game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCard = async (index: number) => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'selectCard',
        args: [BigInt(index)],
      });
      setSelectedCardIndex(index);
      await refetchCurrentBattle();
    } catch (error) {
      console.error('Error selecting card:', error);
      setError('Failed to select the card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevealMove = async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    const randomness = BigInt(Math.floor(Math.random() * 1000000));
    
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'revealMove',
        args: [randomness],
      });
      await refetchCurrentBattle();
    } catch (error) {
      console.error('Error revealing move:', error);
      setError('Failed to reveal the move. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = (card: Card, index: number) => (
    <div
      key={card.id.toString()}
      className={`bg-white bg-opacity-80 border rounded-lg p-4 cursor-pointer transition-all ${
        selectedCardIndex === index ? 'bg-blue-100 border-blue-500' : 'hover:border-gray-400'
      }`}
      onClick={() => handleSelectCard(index)}
    >
      <p>Attack: {card.attack.toString()}</p>
      <p>Defense: {card.defense.toString()}</p>
      <p>Speed: {card.speed.toString()}</p>
    </div>
  );

  const renderBattleInfo = (battle: Battle) => (
    <div className="bg-white bg-opacity-80 p-4 rounded-lg">
      <p><span className="font-bold">Player 1:</span> {battle.player1.addr}</p>
      <p><span className="font-bold">Player 2:</span> {battle.player2.addr}</p>
      <p><span className="font-bold">Stage:</span> {Stage[battle.stage]}</p>
      <p><span className="font-bold">Deadline:</span> {new Date(Number(battle.deadline) * 1000).toLocaleString()}</p>
    </div>
  );

  const renderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Battle Result</h2>
        {battleResult?.isTie ? (
          <p className="text-xl">It's a tie!</p>
        ) : (
          <>
            <p className="mb-2"><span className="font-bold">Winner:</span> {battleResult?.winner}</p>
            <p><span className="font-bold">Loser:</span> {battleResult?.loser}</p>
          </>
        )}
        <button
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          onClick={() => setShowModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const hasCards = playerCards && playerCards.length > 0 && playerCards[0].id !== 0n;

  return (
    <div className="min-h-screen bg-cover bg-center" style={{backgroundImage: "url('/pokbg.jpg')"}}>
      <div className="container mx-auto p-4 min-h-screen bg-black bg-opacity-50">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Card Battle Game</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {!isConnected ? (
          <p className="text-center text-lg text-white">Please connect your wallet to play.</p>
        ) : !hasCards ? (
          <div className="text-center">
            <button
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
              onClick={handleEnterGame}
            >
              Enter Game
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">Your Cards:</h2>
              <div>
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors mr-2"
                  onClick={checkCards}
                >
                  Refresh Game State
                </button>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
                  onClick={handleExitGame}
                >
                  Exit Game
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {playerCards?.map((card, index) => renderCard(card, index))}
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Current Battle:</h2>
              {currentBattle ? (
                renderBattleInfo(currentBattle)
              ) : (
                <p className="text-lg text-white">No active battle. Select a card to start a new battle.</p>
              )}
            </div>
            {currentBattle && currentBattle.stage === Stage.Reveal && (
              <div className="text-center">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
                  onClick={handleRevealMove}
                >
                  Reveal Move
                </button>
              </div>
            )}
          </div>
        )}
        {showModal && renderModal()}
      </div>
    </div>
  );
};

export default CardBattleGame;