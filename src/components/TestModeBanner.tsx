import { useTestMode } from '../contexts/TestModeContext';

export default function TestModeBanner() {
  const { isTestMode, testRestaurant } = useTestMode();

  if (!isTestMode || !testRestaurant) return null;

  return (
    <div className="bg-orange-100 border-b border-orange-200 px-4 py-2">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm font-medium text-orange-800">
            MODO TESTE - {testRestaurant.name}
          </span>
          <span className="text-xs text-orange-600">
            ({testRestaurant.domain})
          </span>
        </div>
      </div>
    </div>
  );
}
