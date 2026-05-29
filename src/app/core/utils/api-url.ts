import { environment } from '../../../environments/environment';

export const apiUrl = (endpoint: string) =>
  `${environment.baseUrl}/${environment.basePath}/${endpoint}`;
