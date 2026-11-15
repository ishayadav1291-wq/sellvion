import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Unplug } from 'lucide-react';
import { AppLanguage, AppMode, IntegrationStatusView } from '../../types';
import { apiRequest } from '../../lib/api';
import { tr } from '../../i18n/translations';

interface IntegrationsHubProps {
  integrations: IntegrationStatusView[];
  appMode: AppMode;
  language?: AppLanguage;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({
  integrations,
  appMode,
  language = 'en',
  onRefresh,
  onNotify,
}) => {
  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const updateField = (provider: string, key: string, val: string) => {
    setFormState((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [key]: val },
    }));
  };

  const handleConnect = async (provider: string) => {
    setBusyProvider(provider);
    try {
      const res = await apiRequest<{ message: string }>(`/api/integrations/${provider}/connect`, {
        method: 'POST',
        body: JSON.stringify({ credentials: formState[provider] || {} }),
      });
      onNotify(res.message);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Verification failed.', 'सत्यापन विफल रहा।')
      );
      onRefresh();
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setBusyProvider(provider);
    try {
      await apiRequest(`/api/integrations/${provider}/disconnect`, { method: 'POST' });
      onNotify(
        tr(language, `${provider} disconnected.`, `${provider} डिस्कनेक्ट हो गया।`)
      );
      onRefresh();
    } catch {
      onNotify(tr(language, 'Could not disconnect.', 'डिस्कनेक्ट नहीं हो सका।'));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleShopifySync = async () => {
    setBusyProvider('shopify-sync');
    try {
      const res = await apiRequest<{ message: string }>('/api/integrations/shopify/sync', {
        method: 'POST',
      });
      onNotify(res.message);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Shopify sync failed.', 'Shopify सिंक विफल रहा।')
      );
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-[#EFF6FF] dark:bg-[#0B1E40] border border-[#BFDBFE] dark:border-[#1E3A5F] text-xs text-[#071A35] dark:text-[#CBD5E1]">
        <div className="font-bold text-[#071A35] dark:text-white">
          {tr(
            language,
            'Credentials are encrypted on the server (AES-256-GCM) and verified directly against each provider API.',
            'सभी क्रेडेंशियल सर्वर पर एन्क्रिप्ट (AES-256-GCM) होते हैं और सीधे प्रोवाइडर API से सत्यापित किए जाते हैं।'
          )}
        </div>
        <p className="mt-1 text-[#475569] dark:text-[#94A3B8]">
          {appMode === 'demo'
            ? tr(
                language,
                'Demo Mode simulates message dispatches safely without external credentials.',
                'डेमो मोड बिना बाहरी क्रेडेंशियल के संदेश डिस्पैच को सुरक्षित रूप से सिमुलेट करता है।'
              )
            : tr(
                language,
                'Live Mode requires verified provider credentials before live sends execute.',
                'लाइव मोड में संदेश भेजने से पहले सत्यापित प्रोवाइडर क्रेडेंशियल आवश्यक हैं।'
              )}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {integrations.map((item) => {
          const isConnected = item.status === 'connected';
          return (
            <div
              key={item.provider}
              className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-extrabold text-[#071A35] dark:text-white">
                      {item.label}
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold flex items-center gap-1 shrink-0 ${
                      isConnected ? 'text-[#16A34A]' : 'text-[#D97706]'
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> {tr(language, 'Connected', 'कनेक्टेड')}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />{' '}
                        {item.status === 'error'
                          ? tr(language, 'Needs Attention', 'ध्यान दें')
                          : tr(language, 'Not Configured', 'सेटअप बाकी')}
                      </>
                    )}
                  </span>
                </div>

                {item.lastError && !isConnected && (
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {item.lastError}
                  </div>
                )}

                {item.requiredFields.length > 0 ? (
                  <div className="space-y-2.5">
                    {item.requiredFields.map((field) => (
                      <div key={field.key} className="text-xs">
                        <label className="block font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.secret ? 'password' : 'text'}
                          value={formState[item.provider]?.[field.key] || ''}
                          onChange={(e) => updateField(item.provider, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F0F7FF] dark:bg-[#061533] text-xs text-[#071A35] dark:text-white">
                    {tr(
                      language,
                      'Managed automatically via server runtime environment secrets.',
                      'सर्वर एनवायरनमेंट सीक्रेट्स द्वारा स्वतः प्रबंधित।'
                    )}
                  </div>
                )}
              </div>

              {item.requiredFields.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <button
                    disabled={busyProvider !== null}
                    onClick={() => handleConnect(item.provider)}
                    className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {busyProvider === item.provider && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{tr(language, 'Verify & Save', 'सत्यापित करें और सेव करें')}</span>
                  </button>

                  {item.provider === 'shopify' && isConnected && (
                    <button
                      disabled={busyProvider !== null}
                      onClick={handleShopifySync}
                      className="h-9 px-3 rounded-lg bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Sync Orders Now', 'ऑर्डर सिंक करें')}</span>
                    </button>
                  )}

                  {isConnected && (
                    <button
                      disabled={busyProvider !== null}
                      onClick={() => handleDisconnect(item.provider)}
                      className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-semibold text-[#DC2626] flex items-center gap-1 cursor-pointer"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Disconnect', 'डिस्कनेक्ट करें')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
