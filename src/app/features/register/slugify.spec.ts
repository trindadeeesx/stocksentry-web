import { slugify, SLUG_PATTERN } from './slugify';

describe('slugify', () => {
  it.each([
    ['Loja Demo', 'loja-demo'],
    ['  Padaria do João  ', 'padaria-do-joao'],
    ['Café & Cia!!', 'cafe-cia'],
    ['A---B', 'a-b'],
    ['--Ação Rápida--', 'acao-rapida'],
    ['Empresa 2000', 'empresa-2000'],
    ['!!!', '']
  ])('"%s" vira "%s"', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('o resultado sempre casa com o padrão do back (quando não vazio)', () => {
    for (const s of ['Ünï Cödé 99', 'a b c', 'X_Y.Z']) {
      expect(SLUG_PATTERN.test(slugify(s))).toBe(true);
    }
  });

  it('o padrão rejeita slugs inválidos', () => {
    for (const bad of ['', 'Abc', 'a--b', '-a', 'a-', 'a b']) {
      expect(SLUG_PATTERN.test(bad)).toBe(false);
    }
  });
});
