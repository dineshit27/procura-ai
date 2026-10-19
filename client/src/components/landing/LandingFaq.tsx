import React from 'react';
import {
  Bot,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Database,
  HelpCircle,
  Package,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useReveal } from './useReveal';

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-procura',
    category: 'Product',
    question: 'What is Procura?',
    answer:
      'Procura is an AI-powered procurement assistant for small businesses. It helps teams describe a purchase, compare catalog options, apply policy controls, and move approved orders through checkout.',
  },
  {
    id: 'who-is-procura-for',
    category: 'Product',
    question: 'Who is Procura designed for?',
    answer:
      'Procura is designed for small and growing teams that need a clearer way to manage everyday purchasing without adding a heavyweight procurement system. It gives requesters, approvers, and operators a shared view of each decision.',
  },
  {
    id: 'what-can-procura-manage',
    category: 'Product',
    question: 'What types of purchases can Procura manage?',
    answer:
      'Procura can manage requests for common business purchases such as equipment, software, office supplies, and services. Each request can include a description, quantity, budget, urgency, and supplier preference.',
  },
  {
    id: 'where-do-i-see-product-details',
    category: 'Product',
    question: 'Where can I see the product and purchase details?',
    answer:
      'The catalog presents available options with pricing and relevant attributes, while the request and history views keep the selected item, policy result, approval state, and checkout status together.',
  },
  {
    id: 'how-workflow-works',
    category: 'Workflow',
    question: 'How does the procurement workflow work?',
    answer:
      'Start a New Request with a natural-language need, budget, quantity, and optional supplier preference. Procura recommends catalog items, evaluates the request with SpendGuard, and sends approved purchases to the history and checkout flow.',
  },
  {
    id: 'what-happens-after-request',
    category: 'Workflow',
    question: 'What happens after I submit a purchase request?',
    answer:
      'Procura records the request, evaluates the available catalog matches, runs the policy checks, and assigns the next state. Depending on the result, it can be approved immediately, routed for approval, or blocked with an explanation.',
  },
  {
    id: 'can-edit-request',
    category: 'Workflow',
    question: 'Can I change a request before checkout?',
    answer:
      'Yes. You can review the selected item and request details before checkout. If the amount, item, or quantity changes, the request should be evaluated again so the policy decision stays aligned with the purchase.',
  },
  {
    id: 'where-track-request',
    category: 'Workflow',
    question: 'Where can I track the status of a request?',
    answer:
      'The workspace surfaces the request state, policy outcome, approval status, and payment state. Purchase history provides the longer-lived record after a request has been processed.',
  },
  {
    id: 'spendguard',
    category: 'SpendGuard',
    question: 'What does SpendGuard decide?',
    answer:
      'SpendGuard evaluates the request against the configured purchasing policies and returns ALLOWED, NEEDS_APPROVAL, or BLOCKED. A blocked request cannot be submitted until its policy issue is resolved.',
  },
  {
    id: 'spendguard-policy-types',
    category: 'SpendGuard',
    question: 'What policies can SpendGuard check?',
    answer:
      'The demo focuses on practical controls such as per-order limits, cumulative spend, approval thresholds, and budget availability. These checks can be combined to show why a request is allowed, escalated, or blocked.',
  },
  {
    id: 'needs-approval',
    category: 'SpendGuard',
    question: 'What does NEEDS_APPROVAL mean?',
    answer:
      'NEEDS_APPROVAL means the request is valid but requires an authorized review before checkout. The purchase remains controlled until that approval is recorded; it does not bypass the policy gate.',
  },
  {
    id: 'blocked-request',
    category: 'SpendGuard',
    question: 'Why might a request be BLOCKED?',
    answer:
      'A request can be blocked when it exceeds a configured limit, conflicts with a purchasing rule, or lacks the required budget context. The policy result is shown so the requester can understand what needs to change.',
  },
  {
    id: 'ai-recommendations',
    category: 'AI',
    question: 'How are catalog recommendations generated?',
    answer:
      'Gemini can score catalog items and explain the trade-offs between options. When Gemini is unavailable, Procura uses its rules-engine fallback so the request flow remains inspectable in the demo workspace.',
  },
  {
    id: 'ai-inputs',
    category: 'AI',
    question: 'What information does the AI use for recommendations?',
    answer:
      'The recommendation step uses the request description, budget, quantity, urgency, supplier preference, and catalog attributes. It uses that context to rank relevant options rather than making a purchase automatically.',
  },
  {
    id: 'ai-explainability',
    category: 'AI',
    question: 'Can the AI explain why an item was recommended?',
    answer:
      'Yes. The workflow is designed to show fit and trade-offs such as price, relevance, and supplier preference. The recommendation supports the decision; the requester and policy controls remain responsible for the final outcome.',
  },
  {
    id: 'ai-approval-boundary',
    category: 'AI',
    question: 'Can the AI approve or buy something on its own?',
    answer:
      'No. AI recommendations are separate from SpendGuard and approval controls. Procura can suggest an option, but a purchase must still satisfy policy and follow the configured approval and checkout path.',
  },
  {
    id: 'paypal-sandbox',
    category: 'Payments',
    question: 'Are payments real?',
    answer:
      'No. The landing-page demo uses PayPal Sandbox only. Checkout is available for approved requests, but it does not charge a real account or process a live purchase.',
  },
  {
    id: 'checkout-requirements',
    category: 'Payments',
    question: 'What is required before checkout is available?',
    answer:
      'The request must have a valid policy result and, when required, a completed approval. Only then does Procura expose the PayPal Sandbox checkout path for the selected purchase.',
  },
  {
    id: 'payment-status',
    category: 'Payments',
    question: 'What payment information is shown after checkout?',
    answer:
      'The workspace records the sandbox payment state alongside the request so you can see whether checkout was opened or completed. It is a demo record and is not a receipt for a real transaction.',
  },
  {
    id: 'live-payments',
    category: 'Payments',
    question: 'Can I switch the demo to live payments?',
    answer:
      'The landing-page experience is intentionally limited to PayPal Sandbox. Live payment processing requires separate production credentials, merchant configuration, security review, and a deliberate deployment decision.',
  },
  {
    id: 'data-demo',
    category: 'Data',
    question: 'Is the catalog and purchase history real?',
    answer:
      'The demo workspace uses simulated catalog and purchase-history records unless your local API is running. This keeps the hackathon demonstration safe while still showing the complete workflow.',
  },
  {
    id: 'data-storage',
    category: 'Data',
    question: 'What data does a request record contain?',
    answer:
      'A request can include its description, selected catalog item, quantity, budget, policy outcome, approval state, and payment status. Keeping these fields together makes the decision trail easier to inspect.',
  },
  {
    id: 'data-local-api',
    category: 'Data',
    question: 'What changes when the local API is running?',
    answer:
      'With the local API running, the workspace can use the configured local persistence and service endpoints instead of relying only on demo data. The landing page still explains the same safe, inspectable workflow.',
  },
  {
    id: 'data-privacy',
    category: 'Data',
    question: 'Is sensitive financial data required for the demo?',
    answer:
      'No. The demo is built around simulated catalog and purchase records, and checkout uses PayPal Sandbox. Avoid entering real payment credentials or confidential company information into a development environment.',
  },
  {
    id: 'try-workspace',
    category: 'Getting started',
    question: 'How do I try the workspace?',
    answer:
      'Choose Open workspace above, or create a purchase request directly from the CTA. You can inspect the overview, browse the catalog, test policy decisions, and walk an approved request through Sandbox checkout.',
  },
  {
    id: 'getting-started-time',
    category: 'Getting started',
    question: 'How long does it take to explore the demo?',
    answer:
      'A complete walkthrough takes only a few minutes: create a request, compare recommendations, inspect the SpendGuard result, review approval when needed, and open the Sandbox checkout flow.',
  },
  {
    id: 'getting-started-path',
    category: 'Getting started',
    question: 'Which path should I follow first?',
    answer:
      'Start with Overview for context, then open New Request to see the workflow in action. Catalog shows the available options, and History shows how completed decisions are retained.',
  },
  {
    id: 'getting-started-help',
    category: 'Getting started',
    question: 'What should I do if a demo step is unavailable?',
    answer:
      'Check that the local API is running and that the request has reached the required state. The FAQ, policy result, and request history provide context for understanding why a step is unavailable.',
  },
];

export const LandingFaq: React.FC = () => {
  const revealRef = useReveal<HTMLElement>();
  const [query, setQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('Product');
  const [openItem, setOpenItem] = React.useState<string | null>(FAQ_ITEMS[0]?.id ?? null);
  const [feedback, setFeedback] = React.useState<Record<string, 'yes' | 'no'>>({});
  const inputId = React.useId();

  const categoryConfig = [
    { value: 'Product', label: 'Product', icon: Package },
    { value: 'Workflow', label: 'Workflow', icon: ClipboardList },
    { value: 'SpendGuard', label: 'Controls', icon: ShieldCheck },
    { value: 'AI', label: 'AI', icon: Bot },
    { value: 'Payments', label: 'Payments', icon: CreditCard },
    { value: 'Data', label: 'Data', icon: Database },
    { value: 'Getting started', label: 'Getting started', icon: HelpCircle },
  ];

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = item.category === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  return (
    <section id="faq" ref={revealRef} className="reveal border-t border-black/5 py-24">
      <div className="landing-wrap">
        <header className="flex flex-col gap-3">
          <p className="landing-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#623cf6]">
            Help by workflow
          </p>
          <div className="flex flex-col gap-2">
            <h2 className="landing-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Product, workflow, or support
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
              Choose a Procura team, then open the questions that match your purchase journey.
            </p>
          </div>
        </header>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:gap-10">
          <div
            className="flex h-auto w-full flex-row gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible"
            role="tablist"
            aria-label="FAQ categories"
          >
            {categoryConfig.map(({ value, label, icon: Icon }) => {
              const active = selectedCategory === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedCategory(value);
                    setOpenItem(FAQ_ITEMS.find((item) => item.category === value)?.id ?? null);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition md:w-full ${
                    active
                      ? 'bg-neutral-100 font-medium text-neutral-950'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950'
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative mb-5">
              <label htmlFor={inputId} className="sr-only">
                Search questions in this FAQ category
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
              <input
                id={inputId}
                type="search"
                value={query}
                placeholder={`Search ${selectedCategory.toLowerCase()} questions...`}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#623cf6] focus:ring-2 focus:ring-[#623cf6]/15"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 hover:text-neutral-950"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {filteredItems.map((item) => {
                const isOpen = openItem === item.id;
                return (
                  <div
                    key={item.id}
                    className={`transition-all duration-200 ${
                      isOpen ? 'rounded-2xl bg-white shadow-[0_12px_35px_rgba(17,17,17,0.07)]' : ''
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenItem(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-6 px-4 py-3.5 text-left text-sm font-semibold text-neutral-950 hover:text-[#623cf6]"
                    >
                      <span>{item.question}</span>
                      <ChevronDown className={`size-5 shrink-0 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-3 px-4 pb-4 text-neutral-600">
                        <p className="text-sm leading-relaxed">{item.answer}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`Mark "${item.question}" as helpful`}
                            onClick={() => setFeedback((current) => ({ ...current, [item.id]: 'yes' }))}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                              feedback[item.id] === 'yes' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-black/10 hover:bg-neutral-50'
                            }`}
                          >
                            <ThumbsUp className="size-3.5" />
                            Helpful
                          </button>
                          <button
                            type="button"
                            aria-label={`Mark "${item.question}" as not helpful`}
                            onClick={() => setFeedback((current) => ({ ...current, [item.id]: 'no' }))}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                              feedback[item.id] === 'no' ? 'border-red-200 bg-red-50 text-red-700' : 'border-black/10 hover:bg-neutral-50'
                            }`}
                          >
                            <ThumbsDown className="size-3.5" />
                            Not helpful
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!filteredItems.length && (
              <div className="rounded-2xl border border-dashed border-black/10 py-10 text-center">
                <p className="text-sm text-neutral-600">No questions match your search.</p>
                <button type="button" onClick={() => setQuery('')} className="mt-3 text-sm font-semibold text-[#623cf6] hover:underline">
                  Clear search
                </button>
              </div>
            )}

            <a
              href="mailto:hello@procura.ai?subject=Procura%20support"
              className="landing-pill landing-pill--purple mt-8 w-fit"
            >
              <CircleDollarSign className="size-4" />
              Reach support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
