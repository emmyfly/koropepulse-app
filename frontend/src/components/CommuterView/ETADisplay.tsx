import { useEffect, useState } from 'react';
import { predictEta, type EtaResponse } from '../../api/backend';
import { backendDayOfWeek, describeStopStatus } from '../../utils/eta';

interface ETADisplayProps {
  stopName: string;
}

export function ETADisplay({ stopName }: ETADisplayProps) {
  const [prediction, setPrediction] = useState<EtaResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    predictEta({
      stop: stopName,
      day_of_week: backendDayOfWeek(now),
      hour: now.getHours(),
      weather_flag: false,
    })
      .then((result) => {
        if (!cancelled) setPrediction(result);
      })
      .catch(() => {
        if (!cancelled) setPrediction(null);
      });
    return () => {
      cancelled = true;
    };
  }, [stopName]);

  const { headline, detail } = describeStopStatus(prediction);

  return (
    <div className="eta-display" role="status">
      <span className="eta-headline">{headline}</span>
      {detail && <span className="eta-detail">{detail}</span>}
    </div>
  );
}
