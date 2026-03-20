export class CreateConsentDto {
  slug: string;
  title: string;
  description?: string;
  isRequired?: boolean;
  version?: string;
  isActive?: boolean;
}
