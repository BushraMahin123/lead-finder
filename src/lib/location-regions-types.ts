export interface LocationCity {
  value: string;
  label: string;
}

export interface LocationState {
  value: string;
  label: string;
  cities?: LocationCity[];
}

export interface LocationRegion {
  value: string;
  label: string;
  states?: LocationState[];
  cities?: LocationCity[];
}
