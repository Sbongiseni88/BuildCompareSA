/**
 * Tests for the deterministic SANS/SABS keyword cross-reference.
 * Badges must be reproducible — same description, same standard, no AI.
 */

import { checkSansCompliance } from '../sans-compliance';

describe('checkSansCompliance', () => {
  it.each([
    ['PPC Surebuild Cement 42.5N 50kg', 'SANS 50197-1'],
    ['Y12 reinforcing steel bar 6m', 'SANS 920'],
    ['Clay face brick NFP', 'SANS 10400-K / SANS 227'],
    ['30MPa readymix concrete', 'SANS 10400-B / SANS 2001-CC1'],
    ['20A single pole circuit breaker', 'SANS 10142-1'],
    ['110mm PVC sewer pipe 6m', 'SANS 10400-P'],
    ['IBR roof sheeting 0.47mm', 'SANS 10400-L'],
    ['Aluminium window frame 1500x900', 'SANS 10400-N'],
    ['150L electric geyser', 'SANS 10254'],
    ['SA Pine roof truss 38x114', 'SANS 1783 / SANS 10163'],
  ])('flags "%s" → %s', (description, standard) => {
    const flag = checkSansCompliance(description);
    expect(flag).not.toBeNull();
    expect(flag!.standard).toBe(standard);
  });

  it('returns null for materials without a mandatory-standard family', () => {
    expect(checkSansCompliance('Masking tape 48mm')).toBeNull();
    expect(checkSansCompliance('Wheelbarrow 65L')).toBeNull();
    expect(checkSansCompliance('')).toBeNull();
    expect(checkSansCompliance(null)).toBeNull();
  });

  it('is deterministic — same input always yields the same flag', () => {
    const a = checkSansCompliance('Cemcrete Portland Cement 50kg');
    const b = checkSansCompliance('Cemcrete Portland Cement 50kg');
    expect(a).toEqual(b);
  });
});
