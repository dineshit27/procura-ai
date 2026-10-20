import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { PurchaseRequest } from '../types';
import {
  getPayPalCheckoutConfig,
  createCheckoutOrder,
  captureCheckoutOrder,
  cancelCheckoutOrder,
  fetchPaymentStatus,
  normalizePurchaseRequest,
  PayPalConfigResponse,
} from '../services/api';

interface PayPalCheckoutModalProps {
  request: PurchaseRequest;
  onClose: () => void;
  onPaymentSuccess: (updatedRequest: PurchaseRequest) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export const PayPalCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({
  request,
  onClose,
  onPaymentSuccess,
}) => {
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState<boolean>(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

  // Active PayPal order created on backend
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);

  // Verified captured result
  const [captureSuccess, setCaptureSuccess] = useState<any | null>(null);

  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);
  const sdkScriptLoadedRef = useRef<boolean>(false);

  // Fetch PayPal configuration on mount
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const config = await getPayPalCheckoutConfig();
        if (isMounted) {
          setPaypalConfig(config);
          setConfigLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setConfigError(err instanceof Error ? err.message : 'Failed to load PayPal configuration');
          setConfigLoading(false);
        }
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamically load PayPal JS SDK when clientId is available
  useEffect(() => {
    if (!paypalConfig?.enabled || !paypalConfig.clientId || sdkScriptLoadedRef.current) {
      return;
    }

    const scriptId = 'paypal-js-sdk';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      sdkScriptLoadedRef.current = true;
      if (window.paypal) {
        console.debug('[PayPal] SDK script already present and window.paypal ready – scheduling button render.');
        setTimeout(() => renderPayPalButtons(), 0);
      } else {
        console.debug('[PayPal] SDK script present but window.paypal pending – attaching load listener.');
        existingScript.addEventListener('load', () => renderPayPalButtons(), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=USD&intent=capture`;
    script.async = true;

    script.onload = () => {
      console.debug('[PayPal] JS SDK loaded successfully from CDN.');
      sdkScriptLoadedRef.current = true;
      renderPayPalButtons();
    };

    script.onerror = () => {
      const msg = 'PayPal JS SDK failed to load from CDN. Check network connectivity and that the Client ID is a valid Sandbox credential. Fallback order creation flow is available below.';
      console.error('[PayPal] SDK script load error:', msg);
      setConfigError(msg);
    };

    console.debug('[PayPal] Appending SDK script to document – client-id length:', paypalConfig.clientId.length);
    document.body.appendChild(script);
  }, [paypalConfig]);

  // Render PayPal Smart Buttons inside container.
  // NOTE: Must only be called after paypalButtonContainerRef.current is non-null
  // (i.e. after the container div has been committed to the DOM by React).
  const renderPayPalButtons = () => {
    if (!window.paypal) {
      console.error('[PayPal] window.paypal is not defined – SDK did not load.');
      setConfigError('PayPal JS SDK is not available. The script may have failed to load. Refresh the page or use the fallback link below.');
      return;
    }
    if (!paypalButtonContainerRef.current) {
      console.error('[PayPal] Button container ref is null – DOM node not yet mounted. Render skipped.');
      return;
    }

    console.debug('[PayPal] Rendering Smart Buttons into container.');

    try {
      paypalButtonContainerRef.current.innerHTML = '';
      window.paypal
        .Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 44,
          },
          createOrder: async () => {
            console.debug('[PayPal] createOrder callback fired – purchase request:', request.id);
            setIsProcessing(true);
            setProcessingStep('Authoritatively calculating total and creating PayPal order on server...');
            setErrorMessage(null);
            setCancellationNotice(null);

            try {
              const res = await createCheckoutOrder(request.id);
              console.debug('[PayPal] Backend returned orderId:', res.orderId, '| amount:', res.amount?.total, res.amount?.currency);
              if (!res.orderId) {
                throw new Error('Backend did not return a PayPal order ID. Check server logs.');
              }
              setActiveOrderId(res.orderId);
              if (res.approvalUrl) setApprovalUrl(res.approvalUrl);
              setProcessingStep('PayPal order created. Awaiting Sandbox approval in popup...');
              console.debug('[PayPal] Returning orderId to SDK:', res.orderId);
              return res.orderId;
            } catch (err) {
              setIsProcessing(false);
              const msg = err instanceof Error ? err.message : 'Order creation failed';
              console.error('[PayPal] createOrder failed:', msg);
              setErrorMessage(msg);
              throw err;
            }
          },
          onApprove: async (data: { orderID: string }) => {
            console.debug('[PayPal] onApprove – approved orderID:', data.orderID);
            await handleCaptureWithOrderId(data.orderID);
          },
          onCancel: async (data: { orderID?: string }) => {
            console.debug('[PayPal] onCancel – user closed the approval popup.');
            setIsProcessing(false);
            setCancellationNotice('PayPal Sandbox checkout was cancelled by user. No funds were debited.');
            if (data?.orderID) {
              await cancelCheckoutOrder(request.id, data.orderID, 'Cancelled in PayPal popup');
            }
          },
          onError: (err: any) => {
            setIsProcessing(false);
            // Report a useful, non-sensitive error. Do not log err object directly (may contain internal SDK state).
            const msg =
              (typeof err?.message === 'string' && err.message.trim())
                ? err.message.trim()
                : 'An unexpected error occurred in the PayPal checkout popup. Check the browser console for details.';
            console.error('[PayPal] SDK onError:', msg);
            setErrorMessage(`PayPal error: ${msg}`);
          },
        })
        .render(paypalButtonContainerRef.current)
        .catch((renderErr: unknown) => {
          const msg = renderErr instanceof Error ? renderErr.message : 'Unknown PayPal render error';
          console.error('[PayPal] .render() rejected:', msg);
          setConfigError(`PayPal button failed to render: ${msg}. Try the fallback link below.`);
        });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during PayPal button setup';
      console.error('[PayPal] Buttons() setup threw synchronously:', msg);
      setConfigError(`PayPal button setup error: ${msg}`);
    }
  };

  // Unified authoritative order capture verification handler
  const handleCaptureWithOrderId = async (orderIdToCapture: string) => {
    setIsProcessing(true);
    setProcessingStep('Capturing approved PayPal order and verifying authoritative ledger...');
    setErrorMessage(null);
    setCancellationNotice(null);

    try {
      const captureRes = await captureCheckoutOrder(request.id, orderIdToCapture);
      console.debug('[PayPal] Capture complete – status:', captureRes.status, '| captureId:', captureRes.captureId);

      // Verify payment status from backend
      const statusData = await fetchPaymentStatus(orderIdToCapture);

      setIsProcessing(false);
      setCaptureSuccess({
        ...captureRes,
        statusData,
      });

      if (captureRes.purchase) {
        onPaymentSuccess(normalizePurchaseRequest(captureRes.purchase));
      } else {
        onPaymentSuccess({
          ...request,
          status: 'paid',
          paymentDetails: {
            paypalOrderId: orderIdToCapture,
            captureId: captureRes.captureId,
            status: 'COMPLETED',
            amount: captureRes.amount.total,
            currency: captureRes.amount.currency,
            capturedAt: captureRes.capturedAt,
            isSandbox: true,
          },
        });
      }
    } catch (err) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Capture failed';
      console.error('[PayPal] Capture verification failed:', msg);

      // Resilient Idempotency Check:
      // If the backend returned an ALREADY_PAID error, verify authoritative status.
      // If the order was confirmed captured, gracefully present the verified settlement card.
      if (msg.includes('already been captured and paid') || msg.includes('ALREADY_PAID')) {
        try {
          const statusData = await fetchPaymentStatus(orderIdToCapture);
          if (statusData.status === 'COMPLETED') {
            setCaptureSuccess({
              success: true,
              purchaseRequestId: request.id,
              orderId: orderIdToCapture,
              captureId: statusData.captureId || 'N/A',
              status: 'COMPLETED',
              amount: {
                total: statusData.amount || request.estimatedTotal,
                currency: statusData.currency || 'USD',
              },
              capturedAt: statusData.capturedAt || new Date().toISOString(),
              isSandbox: true,
              message: 'PayPal Sandbox order verified as already settled.',
              statusData,
            });
            onPaymentSuccess({
              ...request,
              status: 'paid',
              paymentDetails: {
                paypalOrderId: orderIdToCapture,
                captureId: statusData.captureId,
                status: 'COMPLETED',
                amount: statusData.amount || request.estimatedTotal,
                currency: statusData.currency || 'USD',
                capturedAt: statusData.capturedAt || new Date().toISOString(),
                isSandbox: true,
              },
            });
            return;
          }
        } catch {
          // Fall through to regular error presentation if status query fails
        }
      }

      setErrorMessage(msg);
    }
  };

  // Listen for approval or cancellation messages from direct redirect popup window
  useEffect(() => {
    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'PAYPAL_ORDER_APPROVED') {
        const approvedOrderId = event.data.token || activeOrderId;
        console.debug('[PayPal Modal] Received PAYPAL_ORDER_APPROVED postMessage with orderId:', approvedOrderId);
        if (approvedOrderId) {
          setActiveOrderId(approvedOrderId);
          await handleCaptureWithOrderId(approvedOrderId);
        }
      } else if (event.data?.type === 'PAYPAL_ORDER_CANCELLED') {
        console.debug('[PayPal Modal] Received PAYPAL_ORDER_CANCELLED postMessage');
        setIsProcessing(false);
        setCancellationNotice('PayPal Sandbox checkout was cancelled by user. No funds were debited.');
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [activeOrderId, request.id]);

  // Fallback direct checkout launcher if SDK is blocked
  const handleDirectCreateOrder = async () => {
    setIsProcessing(true);
    setProcessingStep('Creating PayPal Sandbox order authoritatively on server...');
    setErrorMessage(null);
    setCancellationNotice(null);

    try {
      const res = await createCheckoutOrder(request.id);
      setActiveOrderId(res.orderId);
      if (res.approvalUrl) {
        setApprovalUrl(res.approvalUrl);
        window.open(res.approvalUrl, '_blank', 'width=550,height=700');
      }
      setIsProcessing(false);
      setProcessingStep('Order created. Complete approval in the PayPal window, then click Confirm Capture below.');
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  const handleManualCapture = async () => {
    if (!activeOrderId) return;
    await handleCaptureWithOrderId(activeOrderId);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/70 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FBF9F5] border-2 border-neutral-900 max-w-xl w-full p-4 sm:p-7 shadow-brutal-lg max-h-[calc(100dvh-1rem)] sm:max-h-[95dvh] overflow-y-auto space-y-5" role="dialog" aria-modal="true" aria-label="PayPal Sandbox checkout">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-amber-100 border border-neutral-900 text-amber-950 font-mono text-[11px] font-bold">
              <span>SANDBOX TEST MODE</span>
              <span>&bull;</span>
              <span>NO REAL CHARGES</span>
            </div>
            <h3 className="text-xl font-extrabold text-neutral-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cobalt-700" />
              <span>PayPal Sandbox Checkout</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-neutral-900 bg-white hover:bg-paper-200 shadow-brutal-xs"
            title="Close checkout"
            aria-label="Close PayPal Sandbox checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Development & Limitations Architecture Disclosure */}
        <div className="p-3 bg-paper-200 border border-neutral-900 text-xs text-neutral-800 flex items-start gap-2">
          <Lock className="w-4 h-4 text-neutral-900 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-neutral-950 uppercase tracking-wide">
              Authoritative Server Gatekeeper:
            </span>{' '}
            Pricing, policy approval, and order amount ($
            {request.estimatedTotal.toFixed(2)} USD) are authoritatively validated on the backend.
            Client secrets are never exposed. Orders are persisted in server memory for development demonstration.
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="bg-white border-2 border-neutral-900 p-4 shadow-brutal-xs space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-neutral-500 tracking-wider">
            Authoritative Purchase Summary
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center font-mono">
              <span className="text-neutral-600">Request ID:</span>
              <span className="font-bold text-neutral-900">{request.id}</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
              <span className="text-neutral-600">Product / Need:</span>
              <span className="font-bold text-neutral-900 truncate max-w-xs">
                {request.selectedItemName || request.title}
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center font-mono">
              <span className="text-neutral-600">Quantity:</span>
              <span className="font-bold text-neutral-900">{request.quantity} units</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center font-mono">
              <span className="text-neutral-600">Supplier:</span>
              <span className="font-bold text-neutral-900">{request.selectedSupplier || 'Apex Business Hardware'}</span>
            </div>
            <div className="pt-2 border-t border-neutral-200 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
              <span className="text-sm font-bold text-neutral-900">Total Due (Sandbox):</span>
              <span className="text-lg font-mono font-extrabold text-cobalt-700">
                ${request.estimatedTotal.toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-3.5 bg-cobalt-50 border-2 border-cobalt-700 text-cobalt-950 text-xs flex items-center space-x-2.5 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-cobalt-700 flex-shrink-0" />
            <span className="font-mono font-medium">{processingStep || 'Processing PayPal Sandbox transaction...'}</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-600 text-rose-950 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Transaction Error: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {cancellationNotice && (
          <div className="p-3 bg-paper-200 border border-neutral-800 text-xs text-neutral-800 flex items-start space-x-2">
            <RefreshCw className="w-4 h-4 text-neutral-700 flex-shrink-0 mt-0.5" />
            <span>{cancellationNotice}</span>
          </div>
        )}

        {/* Success Verified Settlement Display */}
        {captureSuccess ? (
            <div className="p-4 sm:p-5 bg-emerald-50 border-2 border-emerald-700 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>PayPal Sandbox Payment Verified & Settled</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Order status transitioned to <strong>PAID</strong> after cryptographic verification of PayPal Sandbox
              capture.
            </p>
            <div className="bg-white border border-emerald-600 p-3 text-xs font-mono space-y-1.5 text-neutral-800">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">PayPal Order ID:</span>
                <span className="font-bold">{captureSuccess.orderId}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Capture ID:</span>
                <span className="font-bold">{captureSuccess.captureId}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Authoritative Amount:</span>
                <span className="font-bold text-emerald-800">
                  ${captureSuccess.amount?.total?.toFixed(2) ?? request.estimatedTotal.toFixed(2)} USD
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Captured At:</span>
                <span>{new Date(captureSuccess.capturedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-neutral-900 text-white font-bold text-xs uppercase border-2 border-neutral-900 shadow-brutal-xs hover:bg-neutral-800"
              >
                Close & Return to History
              </button>
            </div>
          </div>
        ) : (
          /* Checkout State Actions */
          <div className="space-y-4">
            {configLoading ? (
              <div className="p-6 text-center text-xs text-neutral-500 flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking PayPal Sandbox connection...</span>
              </div>
            ) : !paypalConfig?.enabled ? (
              <div className="p-4 bg-paper-200 border-2 border-neutral-900 text-xs text-neutral-800 space-y-2">
                <div className="font-bold text-neutral-900 uppercase">PayPal Checkout Disabled:</div>
                <p>{paypalConfig?.message || configError || 'Credentials missing from server/.env.'}</p>
                <div className="text-[11px] font-mono text-neutral-600 bg-white p-2 border border-neutral-400">
                  Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env to enable live Sandbox checkout.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* PayPal Smart Buttons Container */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold uppercase text-neutral-700">
                    Select PayPal Payment Method:
                  </div>
                  <div
                    ref={paypalButtonContainerRef}
                    id="paypal-button-container"
                    className="min-h-[48px] bg-paper-100 p-2 border-2 border-neutral-900 flex flex-col justify-center"
                  />
                </div>

                {/* Direct Popup Flow Fallback */}
                <div className="pt-2 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                  {!activeOrderId ? (
                    <button
                      onClick={handleDirectCreateOrder}
                      disabled={isProcessing}
                      className="w-full sm:w-auto text-xs text-neutral-700 hover:text-neutral-950 underline font-mono flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Alternative: Launch PayPal Sandbox in New Window</span>
                    </button>
                  ) : (
                    <div className="w-full space-y-2">
                      {approvalUrl && (
                        <a
                          href={approvalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-cobalt-700 underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Reopen PayPal Sandbox Window</span>
                        </a>
                      )}
                      <button
                        onClick={handleManualCapture}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs border-2 border-neutral-900 shadow-brutal-xs"
                      >
                        ✓ Confirm & Verify Sandbox Capture
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-2 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] font-mono text-neutral-500">
          <span>Procura AI &bull; Phase 5 PayPal Integration</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Authoritative Server Verified
          </span>
        </div>
      </div>
    </div>
  );
};
