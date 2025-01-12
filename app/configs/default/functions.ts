import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from "@solana/web3.js"; 
import { FunctionHandler } from "../../types/types";
import { getTokenInfo } from "../../api/token/tokenMappings";
import fetch from "cross-fetch";
import { AssetItem, PortfolioResult, TokenInfo  } from "../../types/types";
import { API_URLS } from '@raydium-io/raydium-sdk-v2'
import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, TokenOwnerOffCurveError, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction } from '@solana/spl-token'
// import { Token } from "@solana/spl-token";

// Add new constant for ORBIS token
const ORBIS_MINT = new PublicKey("E9WqyaJjvYTZCEx7T8DzBHnkBz7BzC6XjR9z7Q4dtWEg");

// Add helper function to get ORBIS token account
export function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) throw new TokenOwnerOffCurveError();

  const [address] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
      associatedTokenProgramId,
  );

  return address;
}


// import { AddressLookupTableAccount, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import axios from 'axios'




// Transaction creation functions
const create_solana_transaction = async (
  recipient_wallet: string,
  amount_sol: number,
  fromPubkey: PublicKey,
  rpcUrl?: string
) => {
  try {
    const connection = new Connection(
      rpcUrl || clusterApiUrl("devnet"),
      "confirmed"
    );
    const toPubkey = new PublicKey(recipient_wallet);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: amount_sol * LAMPORTS_PER_SOL,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return {
      transaction: transaction,
      connection: connection,
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};





const getPortfolioBalance = async (
  walletAddress: string,
  includeNfts: boolean = true
) => {
  if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    throw new Error('Helius API key not found');
  }

  const url = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'portfolio-analysis',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: walletAddress,
        page: 1,
        limit: 1000,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
          // Remove showNfts as it's not a valid option
          showCollectionMetadata: includeNfts,  // This is the closest equivalent
          showUnverifiedCollections: includeNfts
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const { result } = await response.json();
  return result;
};

// Add new interfaces
interface OrbisTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'rejected';
  campaign: string;
  reward: number;
  dueDate: string;
}

interface OrbisEarnings {
  total: number;
  tokenBalance: number;
  timeframe: string;
  transactions: Array<{
    date: string;
    amount: number;
    type: string;
  }>;
}

// Update the task-related functions to use real API endpoints
const getOrbisTasksFromApi = async (status: string, campaign?: string) => {
  if (!process.env.NEXT_PUBLIC_ORBIS_API_URL || !process.env.NEXT_PUBLIC_ORBIS_API_KEY) {
    throw new Error('Orbis API configuration missing');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_ORBIS_API_URL}/tasks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ORBIS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status,
      campaign
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
};

const getOrbisEarningsFromApi = async (timeframe: string) => {
  if (!process.env.NEXT_PUBLIC_ORBIS_API_URL || !process.env.NEXT_PUBLIC_ORBIS_API_KEY) {
    throw new Error('Orbis API configuration missing');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_ORBIS_API_URL}/earnings`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ORBIS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timeframe
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
};

// Function handlers map
export const functionHandlers: Record<string, FunctionHandler> = {
  send_solana_transaction: async (args, wallet, rpcUrl) => {
    if (!wallet.connected || !wallet.signTransaction || !wallet.publicKey) {
      return "Please connect your wallet first";
    }

    try {
      const { transaction, connection } = await create_solana_transaction(
        args.recipient_wallet,
        args.amount_sol,
        wallet.publicKey,
        rpcUrl
      );

      const signedTx = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      return `Transaction successful! ✅`;
    } catch (error: unknown) {
      console.error("Transaction error:", error);
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return "Transaction failed: Unknown error occurred";
    }
  },

  

  get_portfolio_balance: async (args, wallet) => {
    try {
      const walletAddress = args.walletAddress || wallet.publicKey?.toString();
      
      if (!walletAddress) {
        return "No wallet address provided or connected";
      }

      const portfolio = await getPortfolioBalance(walletAddress, args.includeNfts);
      
      // Format native SOL balance and value
      const solBalance = (portfolio.nativeBalance?.lamports || 0) / LAMPORTS_PER_SOL;
      const solPrice = portfolio.nativeBalance?.price_per_sol || 0;
      const solValue = portfolio.nativeBalance?.total_price || 0;
      
      let response = `📊 Portfolio Analysis for ${walletAddress}\n\n`;
      response += `💰 Native SOL Balance: ${solBalance.toFixed(4)} SOL`;
      response += ` ($${solPrice.toFixed(2)} per SOL = $${solValue.toFixed(2)})\n\n`;
      
      let totalPortfolioValue = solValue;
      
      if (portfolio.items?.length > 0) {
        response += "🪙 Token Holdings:\n";
        portfolio.items
          .filter((item: AssetItem) => item.interface === "FungibleToken")
          .forEach((token: any) => {
            const tokenBalance = token.token_info?.balance || 0;
            const decimals = token.token_info?.decimals || 0;
            const humanBalance = tokenBalance / Math.pow(10, decimals);
            const symbol = token.token_info?.symbol || token.content?.metadata?.symbol || "Unknown";
            const pricePerToken = token.token_info?.price_info?.price_per_token || 0;
            const totalValue = token.token_info?.price_info?.total_price || 0;
            
            totalPortfolioValue += totalValue;
            
            response += `- ${humanBalance.toFixed(4)} ${symbol}`;
            if (pricePerToken > 0) {
              response += ` ($${pricePerToken.toFixed(6)} per token = $${totalValue.toFixed(2)})\n`;
            } else {
              response += ` (No price data available)\n`;
            }
          });
          
        if (args.includeNfts) {
          const nfts = portfolio.items.filter((item: AssetItem) => item.interface === "V1_NFT");
          response += `\n🖼️ NFTs: ${nfts.length} items\n`;
        }
      }
      
      response += `\n💎 Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}\n`;

      return response;
    } catch (error: unknown) {
      console.error("Portfolio analysis error:", error);
      if (error instanceof Error) {
        return `Failed to get portfolio: ${error.message}`;
      }
      return "Failed to get portfolio: Unknown error occurred";
    }
  },

  get_orbis_tasks: async (args) => {
    try {
      const tasks = await getOrbisTasksFromApi(
        args.status || 'all',
        args.campaign
      );

      return JSON.stringify(tasks, null, 2);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return `Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  get_orbis_earnings: async (args) => {
    try {
      const earnings = await getOrbisEarningsFromApi(args.timeframe || 'all');
      return JSON.stringify(earnings, null, 2);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return `Failed to fetch earnings: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  join_orbis_campaign: async (args) => {
    try {
      if (!process.env.NEXT_PUBLIC_ORBIS_API_URL || !process.env.NEXT_PUBLIC_ORBIS_API_KEY) {
        throw new Error('Orbis API configuration missing');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_ORBIS_API_URL}/campaigns/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ORBIS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: args.campaignId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to join campaign: ${response.status}`);
      }

      const result = await response.json();
      return `Successfully joined campaign ${args.campaignId}`;
    } catch (error) {
      console.error('Error joining campaign:', error);
      return `Failed to join campaign: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  submit_task_review: async (args) => {
    try {
      if (!process.env.NEXT_PUBLIC_ORBIS_API_URL || !process.env.NEXT_PUBLIC_ORBIS_API_KEY) {
        throw new Error('Orbis API configuration missing');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_ORBIS_API_URL}/tasks/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ORBIS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: args.taskId,
          rating: args.rating,
          rationale: args.rationale
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.status}`);
      }

      const result = await response.json();
      return `Review submitted successfully for task ${args.taskId} with rating ${args.rating}/7`;
    } catch (error) {
      console.error('Error submitting review:', error);
      return `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  get_orbis_balance: async (args, wallet) => {
    if (!wallet.publicKey && !args.walletAddress) {
      return "Please connect your wallet or provide a wallet address";
    }

    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_HELIUS_API_KEY || clusterApiUrl("devnet"),
        "confirmed"
      );

      const walletToCheck = args.walletAddress 
        ? new PublicKey(args.walletAddress)
        : wallet.publicKey!;

      let ata = getAssociatedTokenAddressSync(ORBIS_MINT, walletToCheck, false);
      const balance = await connection.getTokenAccountBalance(ata, "processed");
      console.log("ORBIS balance:", balance?.value?.uiAmountString);
      return `ORBIS Balance: ${balance?.value?.uiAmountString} ORBIS`;
    } catch (error) {
      console.error("Error getting ORBIS balance:", error);
      // return `Failed to get ORBIS balance: ${error instanceof Error ? error.message : "Unknown error"}`;
      return `You don't have any ORBIS tokens in your wallet yet! consider joining the ORBIS campaign to earn some tokens`;
    }
  },

  transfer_orbis: async (args, wallet) => {
    if (!wallet.connected || !wallet.signTransaction || !wallet.publicKey) {
      return "Please connect your wallet first";
    }

    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_HELIUS_API_KEY || clusterApiUrl("devnet"),
        "confirmed"
      );

      const walletToCheck = args.walletAddress 
        ? new PublicKey(args.walletAddress)
        : wallet.publicKey!;

      // Get source token account
        const from = new PublicKey(walletToCheck);
        const to = new PublicKey(args.recipient_wallet);
        const mint = new PublicKey(ORBIS_MINT);

        const fromATA = getAssociatedTokenAddressSync(mint, from);
        console.log("fromATA",fromATA)
        const toATA = getAssociatedTokenAddressSync(mint, to);
        console.log("toATA",toATA)

        const instructions = [];
        
        const toAccount = await connection.getAccountInfo(toATA);
        if (!toAccount) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    from,           // payer
                    toATA,         // ata
                    to,            // owner
                    mint,          // mint
                )
            );
        }

        instructions.push(
          createTransferCheckedInstruction(
              fromATA,           // from
              mint,             // mint
              toATA,            // to
              from,             // owner
              args.amount * Math.pow(10, 6),           // amount
              6                 // decimals
          )
      );

      
      const transaction = new Transaction().add(...instructions);


      const { blockhash,lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
        preflightCommitment: "confirmed"
      });

      await connection.confirmTransaction({
        signature,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      });
      return `Successfully transferred ✅ ${args.amount} ORBIS tokens! Transaction: ${signature}`;
    } catch (error) {
      console.error("Transfer error:", error);
      return `Failed to transfer ORBIS tokens: Please try again later`;
    }
  },
};