type DataLayerEvent = {
  event: 'form_submit';
  form_id: 'boracomer-signup';
  form_name: string;
};

function dataLayer(): DataLayerEvent[] {
  const w = window as Window & { dataLayer?: DataLayerEvent[] };
  if (!w.dataLayer) w.dataLayer = [];
  return w.dataLayer;
}

/** Dispara só depois do cadastro de restaurante na captar concluir. */
export function pushCaptarRestaurantSubmit(restaurantName: string): void {
  const name = restaurantName.trim() || 'Restaurante';
  dataLayer().push({
    event: 'form_submit',
    form_id: 'boracomer-signup',
    form_name: `${name} - Trial`,
  });
}
