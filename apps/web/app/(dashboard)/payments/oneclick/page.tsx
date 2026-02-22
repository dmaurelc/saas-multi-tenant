'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { OneclickInscription, PaymentMethodsList } from '@/components/payments/OneclickInscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { CreditCard, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

// Mock payment methods - in production, fetch from API
interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  createdAt: Date;
}

/**
 * Oneclick Example Page
 *
 * This page demonstrates the Transbank Oneclick integration for recurring payments.
 *
 * Flow:
 * 1. User clicks "Inscribir Tarjeta" to start card enrollment
 * 2. User is redirected to Webpay to complete enrollment
 * 3. User returns with a token in the URL
 * 4. Token is used to finish inscription and get tbk_user
 * 5. Card is stored and can be used for recurring payments
 */
export default function OneclickExamplePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultMethodId, setDefaultMethodId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showInscription, setShowInscription] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Simulated tenant ID - in production, get from auth context
  const tenantId = 'tenant-123';

  useEffect(() => {
    // Load existing payment methods
    loadPaymentMethods();

    // If returning from Webpay with a token, the OneclickInscription component
    // will automatically handle finishing the inscription
    if (token) {
      setMessage({
        type: 'info',
        text: 'Procesando inscripción de tarjeta...',
      });
    }
  }, [token]);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch('/api/v1/payments/oneclick/methods');
      // const data = await response.json();

      // Mock data for demonstration
      setPaymentMethods([
        // {
        //   id: 'pm-123',
        //   last4: '4242',
        //   brand: 'Visa',
        //   createdAt: new Date('2024-01-15')
        // }
      ]);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setMessage({
        type: 'error',
        text: 'Error al cargar métodos de pago',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInscriptionSuccess = (paymentMethod: {
    id: string;
    type: string;
    last4: string;
    brand: string;
  }) => {
    // Add new payment method to list
    const newMethod: PaymentMethod = {
      id: paymentMethod.id,
      last4: paymentMethod.last4,
      brand: paymentMethod.brand,
      createdAt: new Date(),
    };
    setPaymentMethods([...paymentMethods, newMethod]);
    setDefaultMethodId(paymentMethod.id);
    setShowInscription(false);

    setMessage({
      type: 'success',
      text: `¡Tarjeta ${paymentMethod.brand} terminada en ****${paymentMethod.last4} inscrita exitosamente!`,
    });

    // Clear message after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRemovePaymentMethod = async (id: string) => {
    try {
      // In production, call API to delete
      // await fetch(`/api/v1/payments/oneclick/${id}`, { method: 'DELETE' });

      // Remove from local state
      setPaymentMethods(paymentMethods.filter((m) => m.id !== id));
      if (defaultMethodId === id) {
        setDefaultMethodId(undefined);
      }

      setMessage({
        type: 'success',
        text: 'Tarjeta eliminada exitosamente',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error removing payment method:', error);
      setMessage({
        type: 'error',
        text: 'Error al eliminar tarjeta',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // In production, call API to set default
      // await fetch(`/api/v1/payments/methods/${id}/default`, { method: 'PUT' });

      setDefaultMethodId(id);
      setMessage({
        type: 'success',
        text: 'Tarjeta predeterminada actualizada',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error setting default payment method:', error);
      setMessage({
        type: 'error',
        text: 'Error al actualizar tarjeta predeterminada',
      });
    }
  };

  const handleTestPayment = async () => {
    if (!defaultMethodId) {
      setMessage({
        type: 'error',
        text: 'Selecciona una tarjeta predeterminada primero',
      });
      return;
    }

    try {
      // In production, call API to authorize payment
      // const response = await fetch('/api/v1/payments/oneclick/authorize', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     amount: 29000,
      //     buyOrder: `test-${Date.now()}`
      //   })
      // });

      setMessage({
        type: 'success',
        text: '¡Pago de prueba autorizado exitosamente! (Simulado)',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error authorizing test payment:', error);
      setMessage({
        type: 'error',
        text: 'Error al autorizar pago de prueba',
      });
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Transbank Oneclick - Ejemplo</h1>
        <p className="text-muted-foreground">
          Inscribir tarjetas para pagos recurrentes automáticos usando Transbank Oneclick Mall
        </p>
      </div>

      {/* Info Banner */}
      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <div className="ml-2">
          <p className="text-sm font-medium text-blue-900">Esta es una página de demostración</p>
          <p className="text-xs text-blue-700 mt-1">
            Para usar en producción, configura las credenciales de Transbank en las variables de
            entorno (TBK_ONECLICK_COMMERCE_CODE y TBK_ONECLICK_API_KEY).
          </p>
        </div>
      </Alert>

      {/* Message Alert */}
      {message && (
        <Alert
          className={
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : message.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }
        >
          {message.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {message.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
          {message.type === 'info' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
          <span className="ml-2 text-sm">{message.text}</span>
        </Alert>
      )}

      {/* Main Content */}
      {!showInscription ? (
        <>
          {/* Payment Methods List */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <PaymentMethodsList
              oneclickMethods={paymentMethods}
              onAdd={() => setShowInscription(true)}
              onRemove={handleRemovePaymentMethod}
              onSetDefault={handleSetDefault}
              defaultMethodId={defaultMethodId}
            />
          )}

          {/* Test Payment Section */}
          {paymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Probar Pago Recurrente
                </CardTitle>
                <CardDescription>
                  Simula un pago recurrente usando la tarjeta inscrita
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">PRO</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monto:</span>
                    <span className="font-medium">$29.000 CLP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tarjeta:</span>
                    <span className="font-medium">
                      {paymentMethods.find((m) => m.id === defaultMethodId)?.brand} ****
                      {paymentMethods.find((m) => m.id === defaultMethodId)?.last4 || 'N/A'}
                    </span>
                  </div>
                </div>

                <Button onClick={handleTestPayment} className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Autorizar Pago de Prueba
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Este es un pago de prueba. No se realizará ningún cargo real.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Back Button */}
          <Button variant="ghost" onClick={() => setShowInscription(false)} className="mb-4">
            ← Volver a métodos de pago
          </Button>

          {/* Inscription Form */}
          <OneclickInscription
            tenantId={tenantId}
            onSuccess={handleInscriptionSuccess}
            onCancel={() => setShowInscription(false)}
          />
        </>
      )}

      {/* Documentation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documentación de Oneclick</CardTitle>
          <CardDescription>Flujo completo de inscripción y pago recurrente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">1. Iniciar Inscripción</h4>
              <p className="text-sm text-muted-foreground">
                POST /api/v1/payments/oneclick/inscribe
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Retorna URL de Webpay para redirigir al usuario
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">2. Usuario Completa en Webpay</h4>
              <p className="text-sm text-muted-foreground">
                Usuario es redirigido a Webpay, ingresa datos de tarjeta y autoriza
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Webpay redirige de vuelta con token en la URL
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">3. Finalizar Inscripción</h4>
              <p className="text-sm text-muted-foreground">
                PUT /api/v1/payments/oneclick/finish/{'{token}'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Retorna tbk_user para usar en pagos futuros
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">4. Autorizar Pago Recurrente</h4>
              <p className="text-sm text-muted-foreground">
                POST /api/v1/payments/oneclick/authorize
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Usa tbk_user almacenado para cobrar sin interacción del usuario
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Variables de Entorno Requeridas</h4>
            <pre className="text-xs overflow-x-auto">
              <code>{`TBK_ONECLICK_COMMERCE_CODE="597032337573"
TBK_ONECLICK_API_KEY="..."`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
