import type { Screen } from 'mobilewright';

export type Loc = ReturnType<Screen['getByTestId']>;
type Role = Parameters<Screen['getByRole']>[0];

/** A selector is plain data. The resolver turns it into a real locator. */
export type Selector =
  | { testId: string }
  | { label: string }
  | { text: string | RegExp; exact?: boolean }
  | { role: Role; name?: string }
  | { type: string }
  | { placeholder: string };

export function toLocator(screen: Screen, s: Selector): Loc {
  if ('testId' in s) return screen.getByTestId(s.testId);
  if ('label' in s) return screen.getByLabel(s.label);
  if ('text' in s) return screen.getByText(s.text as string, s.exact === undefined ? undefined : { exact: s.exact });
  if ('role' in s) return s.name ? screen.getByRole(s.role, { name: s.name }) : screen.getByRole(s.role);
  if ('type' in s) return screen.getByType(s.type);
  return screen.getByPlaceholder(s.placeholder);
}
