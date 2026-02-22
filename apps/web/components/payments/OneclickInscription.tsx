'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { CreditCard, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface OneclickInscriptionProps {
  tenantId: string;
  onSuccess?: (paymentMethod: { id: string; type: string; last4: string; brand: string }) => void;
  onCancel?: () => void;
}

type Step = 'idle' | 'inscribing' | 'redirecting' | 'success' | 'error';

export function OneclickInscription({ tenantId, onSuccess, onCancel }: OneclickInscriptionProps) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inscriptionUrl, setInscriptionUrl] = useState<string | null>(null);
  const [cardInfo, setCardInfo] = useState<{ last4: string; brand: string } | null>(null);

  const startInscription = async () => {
    setStep('inscribing');
    setError(null);

    try {
      const response = await fetch('/api/v1/payments/oneclick/inscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start inscription');
      }

      const data = await response.json();

      // Redirect to Webpay for card enrollment
      setStep('redirecting');
      setInscriptionUrl(data.url);

      // Open Webpay in new window or iframe
      window.location.href = data.url;
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // This would be called when user returns from Webpay with the token
  // The token is in the URL query params
  const finishInscription = async (token: string) => {
    setStep('inscribing');
    setError(null);

    try {
      const response = await fetch(`/api/v1/payments/oneclick/finish/${token}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to finish inscription');
      }

      const data = await response.json();

      setStep('success');
      setCardInfo(data.paymentMethod);

      if (onSuccess) {
        onSuccess(data.paymentMethod);
      }
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Check if we have a token in the URL (returning from Webpay)
  // This would typically be handled by a callback page
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token && step === 'idle') {
      finishInscription(token);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Inscribir Tarjeta para Pagos Recurrentes
        </CardTitle>
        <CardDescription>
          Transbank Oneclick te permite realizar pagos recurrentes sin ingresar los datos de tu
          tarjeta en cada compra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              1
            </div>
            <p className="text-sm text-muted-foreground">
              Haz clic en "Inscribir Tarjeta" para ser redirigido a Webpay de forma segura.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              Completa el proceso de inscripción en la página de Transbank.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              3
            </div>
            <p className="text-sm text-muted-foreground">
              Serás redirigido de vuelta y tu tarjeta quedará inscrita para pagos automáticos.
            </p>
          </div>
        </div>

        {/* Success state */}
        {step === 'success' && cardInfo && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">¡Tarjeta inscrita exitosamente!</AlertTitle>
            <div className="mt-2 text-sm">
              <p>
                Tarjeta {cardInfo.brand} terminada en ****{cardInfo.last4} ahora está disponible
                para pagos recurrentes.
              </p>
            </div>
          </Alert>
        )}

        {/* Error state */}
        {step === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en la inscripción</AlertTitle>
            <div className="mt-2 text-sm">
              <p>{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setStep('idle');
                setError(null);
              }}
            >
              Intentar nuevamente
            </Button>
          </Alert>
        )}

        {/* Loading state */}
        {(step === 'inscribing' || step === 'redirecting') && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {step === 'inscribing' ? 'Iniciando inscripción...' : 'Redirigiendo a Webpay...'}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {step === 'idle' && (
          <div className="flex gap-3">
            <Button onClick={startInscription} className="flex-1" size="lg">
              <CreditCard className="mr-2 h-4 w-4" />
              Inscribir Tarjeta
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} size="lg" className="flex-1">
                Cancelar
              </Button>
            )}
          </div>
        )}

        {/* Security notice */}
        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <AlertTitle className="text-blue-900 text-sm"> 🔒 Seguridad garantizada</AlertTitle>
          <div className="mt-2 text-xs text-blue-700">
            <p>
              Tu información de tarjeta es procesada directamente por Transbank. No almacenamos los
              datos completos de tu tarjeta, solo un token seguro para pagos futuros. Tu tarjeta
              está protegida por los estándares de seguridad PCI-DSS.
            </p>
          </div>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Props for the payment methods list component
interface PaymentMethodsListProps {
  oneclickMethods: Array<{
    id: string;
    last4: string;
    brand: string;
    createdAt: Date;
  }>;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  defaultMethodId?: string;
}

export function PaymentMethodsList({
  oneclickMethods,
  onAdd,
  onRemove,
  onSetDefault,
  defaultMethodId,
}: PaymentMethodsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>
              Tarjetas inscritas con Transbank Oneclick para pagos recurrentes
            </CardDescription>
          </div>
          {onAdd && (
            <Button onClick={onAdd} size="sm" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Agregar Tarjeta
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {oneclickMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              No tienes tarjetas inscritas. Agrega una para habilitar pagos recurrentes automáticos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {oneclickMethods.map((method) => (
              <div
                key={method.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  method.id === defaultMethodId ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-12 h-8 rounded bg-linear-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {method.brand} ****{method.last4}
                      {method.id === defaultMethodId && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Predeterminada
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inscrita el {new Date(method.createdAt).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.id !== defaultMethodId && onSetDefault && (
                    <Button variant="ghost" size="sm" onClick={() => onSetDefault(method.id)}>
                      Establecer
                    </Button>
                  )}
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemove(method.id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OneclickInscription;
