import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { AppLanguage } from '../../types';
import { apiRequest } from '../../lib/api';
import { tr } from '../../i18n/translations';

interface CsvImportWizardProps {
  language?: AppLanguage;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

const SAMPLE_CSVS: Record<string, string> = {
  customers: `name,phone,city,state,primary_category,last_product_ordered,average_cadence_days,outstanding_udhaar
Deepak Joshi,+91 98220 11223,Indore,Madhya Pradesh,Grocery,Basmati Rice 5kg,25,1200
Neha Kapoor,+91 98111 44556,Chandigarh,Punjab,Beverages,Assam Gold Tea 1kg,30,0`,
  products: `sku,name,category,price,typical_cadence_days,stock_qty
RICE-5KG,Aged Basmati Rice 5kg,Grains,780,25,40
TEA-1KG,Assam Gold Leaf Tea 1kg,Beverages,950,30,32`,
  orders: `phone,order_number,items,amount,payment_mode,delivery_address,pincode
+91 98220 11223,ORD-CSV-101,Basmati Rice 5kg,780,COD,Near Rajwada Indore,452001`,
};

const TARGET_FIELDS: Record<string, string[]> = {
  customers: ['name', 'phone', 'city', 'state', 'primary_category', 'last_product_ordered', 'average_cadence_days', 'outstanding_udhaar'],
  products: ['sku', 'name', 'category', 'price', 'typical_cadence_days', 'stock_qty'],
  orders: ['phone', 'order_number', 'items', 'amount', 'payment_mode', 'delivery_address', 'pincode'],
  udhaar: ['phone', 'amount', 'due_date', 'notes'],
  payments: ['phone', 'amount', 'method', 'reference_id'],
};

interface ImportBatch {
  id: string;
  entity_type: string;
  filename: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  status: string;
  created_at: string;
}

export const CsvImportWizard: React.FC<CsvImportWizardProps> = ({
  language = 'en',
  onRefresh,
  onNotify,
}) => {
  const [entityType, setEntityType] = useState<'customers' | 'products' | 'orders' | 'udhaar' | 'payments'>('customers');
  const [csvText, setCsvText] = useState(SAMPLE_CSVS.customers);
  const [filename, setFilename] = useState('customers-sample.csv');
  const [preview, setPreview] = useState<{ headers: string[]; totalRows: number; sampleRows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [lastResult, setLastResult] = useState<{
    importedRows: number;
    skippedRows: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadBatches = async () => {
    try {
      const res = await apiRequest<{ batches: ImportBatch[] }>('/api/imports/batches');
      setBatches(res.batches);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
      setPreview(null);
      setLastResult(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      const res = await apiRequest<{ headers: string[]; totalRows: number; sampleRows: string[][] }>(
        '/api/imports/preview',
        { method: 'POST', body: JSON.stringify({ csvText, entityType }) }
      );
      setPreview(res);
      const autoMap: Record<string, string> = {};
      for (const field of TARGET_FIELDS[entityType]) {
        const match = res.headers.find((h) => h.toLowerCase() === field.toLowerCase());
        if (match) autoMap[field] = match;
      }
      setMapping(autoMap);
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Preview failed.', 'प्रीव्यू विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleExecute = async () => {
    setBusy(true);
    try {
      const res = await apiRequest<{
        batchId: string;
        importedRows: number;
        skippedRows: number;
        errors: Array<{ row: number; reason: string }>;
      }>('/api/imports/execute', {
        method: 'POST',
        body: JSON.stringify({ entityType, filename, csvText, mapping }),
      });
      setLastResult(res);
      onNotify(
        tr(
          language,
          `Imported ${res.importedRows} row(s) (${res.skippedRows} duplicates skipped).`,
          `${res.importedRows} पंक्तियाँ आयात हुईं (${res.skippedRows} डुप्लीकेट छोड़े गए)।`
        )
      );
      loadBatches();
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Import failed.', 'आयात विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async (batchId: string) => {
    setBusy(true);
    try {
      const res = await apiRequest<{ removedRecords: number }>(`/api/imports/${batchId}/rollback`, {
        method: 'POST',
      });
      onNotify(
        tr(
          language,
          `Rolled back ${res.removedRecords} imported record(s).`,
          `${res.removedRecords} आयात किए गए रिकॉर्ड वापस लिए गए।`
        )
      );
      loadBatches();
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Rollback failed.', 'रोलबैक विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#071A35] dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#2563EB] dark:text-[#22D3EE]" />
              <span>{tr(language, 'CSV Store Data Importer', 'CSV स्टोर डेटा इम्पोर्टर')}</span>
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {tr(
                language,
                'Upload customers, products, orders, udhaar, or payments with duplicate protection and rollback.',
                'डुप्लीकेट सुरक्षा और रोलबैक के साथ ग्राहक, उत्पाद, ऑर्डर, उधार या भुगतान अपलोड करें।'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={entityType}
              onChange={(e) => {
                const next = e.target.value as typeof entityType;
                setEntityType(next);
                setCsvText(SAMPLE_CSVS[next] || '');
                setPreview(null);
                setLastResult(null);
              }}
              className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] font-bold text-[#071A35] dark:text-white"
            >
              <option value="customers">{tr(language, 'Customers', 'ग्राहक')}</option>
              <option value="products">{tr(language, 'Products', 'उत्पाद')}</option>
              <option value="orders">{tr(language, 'Orders', 'ऑर्डर')}</option>
              <option value="udhaar">{tr(language, 'Udhaar Balances', 'उधार बकाया')}</option>
              <option value="payments">{tr(language, 'Payments', 'भुगतान')}</option>
            </select>

            <label className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] font-bold flex items-center gap-1.5 cursor-pointer text-[#071A35] dark:text-white">
              <span>{tr(language, 'Choose CSV File', 'CSV फ़ाइल चुनें')}</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <textarea
          rows={5}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] p-3 font-mono text-xs text-[#071A35] dark:text-white"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={busy || !csvText.trim()}
            onClick={handlePreview}
            className="h-9 px-4 rounded-lg bg-[#071A35] hover:bg-[#2563EB] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {tr(language, '1. Preview & Map Columns', '1. कॉलम प्रीव्यू और मैप करें')}
          </button>
          {preview && (
            <button
              disabled={busy}
              onClick={handleExecute}
              className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {tr(language, `2. Import ${preview.totalRows} Row(s)`, `2. ${preview.totalRows} पंक्तियाँ आयात करें`)}
            </button>
          )}
        </div>

        {preview && (
          <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div className="text-xs font-bold text-[#071A35] dark:text-white">
              {tr(
                language,
                `Column Mapping (${preview.totalRows} rows detected)`,
                `कॉलम मैपिंग (${preview.totalRows} पंक्तियाँ मिलीं)`
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {TARGET_FIELDS[entityType].map((field) => (
                <div key={field}>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    {field}
                  </label>
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  >
                    <option value="">{tr(language, '-- Skip --', '-- छोड़ें --')}</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastResult && (
          <div className="p-3.5 rounded-xl bg-[#F0F7FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] text-xs space-y-1.5">
            <div className="font-bold text-[#071A35] dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span className="tabular-nums">
                {tr(
                  language,
                  `Imported ${lastResult.importedRows} rows · Skipped ${lastResult.skippedRows} duplicates · ${lastResult.errors.length} error(s)`,
                  `${lastResult.importedRows} पंक्तियाँ आयात · ${lastResult.skippedRows} डुप्लीकेट छोड़े · ${lastResult.errors.length} त्रुटि`
                )}
              </span>
            </div>
            {lastResult.errors.map((err, i) => (
              <div key={i} className="text-[#DC2626] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {tr(language, 'Row', 'पंक्ति')} {err.row}: {err.reason}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Batch History & Rollback */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3">
        <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white">
          {tr(language, 'Import History & Rollback', 'आयात इतिहास और रोलबैक')}
        </h4>
        {batches.length === 0 ? (
          <p className="text-xs text-[#64748B]">
            {tr(language, 'No CSV imports run yet.', 'अभी तक कोई CSV आयात नहीं हुआ है।')}
          </p>
        ) : (
          <div className="space-y-2">
            {batches.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-[#071A35] dark:text-white">
                    {b.filename} ({b.entity_type})
                  </span>{' '}
                  <span className="text-[#64748B]">
                    · {b.imported_rows} {tr(language, 'imported', 'आयात')}, {b.skipped_rows} {tr(language, 'skipped', 'छोड़े गए')} · {b.status}
                  </span>
                </div>
                {b.status === 'completed' && b.imported_rows > 0 && (
                  <button
                    disabled={busy}
                    onClick={() => handleRollback(b.id)}
                    className="h-8 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#DC2626] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{tr(language, 'Rollback', 'वापस लें')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
