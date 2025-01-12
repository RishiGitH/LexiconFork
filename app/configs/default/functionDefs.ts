export const tools = [
  {
    name: "send_solana_transaction",
    description:
      "Creates a Solana transaction to send a specified amount of SOL to a recipient wallet.",
    strict: true,
    parameters: {
      type: "object",
      required: ["recipient_wallet", "amount_sol"],
      properties: {
        amount_sol: {
          type: "number",
          description: "The amount of SOL to send.",
        },
        recipient_wallet: {
          type: "string",
          description:
            "The recipient's Solana wallet address. guney means C43TUJNRzeo3cTQo7h9UYmqZwivUNp8tE1WTFdTLMmid",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_portfolio_balance",
    description: "Gets the portfolio balance and assets for a wallet address.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "The Solana wallet address to check the portfolio for if user doesn't provide a wallet address, it will use the connected wallet",
        },
        includeNfts: {
          type: "boolean",
          description: "Whether to include NFTs in the portfolio analysis",
          default: true
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_orbis_tasks",
    description: "Gets the list of available Orbis AI tasks for the user.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "pending", "completed", "rejected"],
          description: "Filter tasks by status",
          default: "all"
        },
        campaign: {
          type: "string",
          description: "Filter tasks by campaign name",
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_orbis_earnings",
    description: "Gets the user's earnings and token balance on Orbis AI.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["daily", "weekly", "monthly", "yearly", "all"],
          description: "Timeframe for earnings calculation",
          default: "all"
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "join_orbis_campaign",
    description: "Join an Orbis AI labeling campaign.",
    strict: true,
    parameters: {
      type: "object",
      required: ["campaignId"],
      properties: {
        campaignId: {
          type: "string",
          description: "The ID of the campaign to join"
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "submit_task_review",
    description: "Submit a review for a completed Orbis AI task.",
    strict: true,
    parameters: {
      type: "object",
      required: ["taskId", "rating", "rationale"],
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task being reviewed"
        },
        rating: {
          type: "number",
          minimum: 1,
          maximum: 7,
          description: "Rating score (1-7)"
        },
        rationale: {
          type: "string",
          description: "Reasoning for the given rating"
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_orbis_balance",
    description: "Gets the ORBIS token balance in your wallet.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "Optional wallet address to check. If not provided, uses connected wallet",
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "transfer_orbis",
    description: "Transfer ORBIS tokens to another wallet.",
    strict: true,
    parameters: {
      type: "object",
      required: ["recipient_wallet", "amount"],
      properties: {
        recipient_wallet: {
          type: "string",
          description: "The recipient's wallet address",
        },
        amount: {
          type: "number",
          description: "The amount of ORBIS tokens to transfer",
        }
      },
      additionalProperties: false,
    },
  }
];
