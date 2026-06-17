/**
 * Catalogue matcher — the join between free-text BoQ lines and the
 * pipeline-scraped product catalogue. Conservative by contract: a match
 * requires EVERY non-brand token of the catalogue entry to appear in the
 * line; anything less stays unmatched (honest N/A), never approximated.
 */
import { matchCatalogueProduct } from '@/lib/catalogue-match';

describe('matchCatalogueProduct', () => {
    it('matches a line that names the product with tender phrasing', () => {
        const m = matchCatalogueProduct(
            'Supply and install hardwood door frame size 813 x 2032mm',
        );
        expect(m).not.toBeNull();
        expect(m!.query).toBe('Hardwood Door Frame 813mm');
        expect(m!.key).toBe('hardwooddoorframe813mm');
    });

    it('tolerates SA decimal commas and missing brand tokens', () => {
        const m = matchCatalogueProduct('Cement (42,5N) in 50kg bags');
        expect(m).not.toBeNull();
        expect(m!.query).toMatch(/Cement 42\.5N 50kg|42\.5N Cement 50kg/);
    });

    it('matches plural/singular variants', () => {
        const m = matchCatalogueProduct('110mm PVC sewer pipes in 6m lengths');
        expect(m).not.toBeNull();
        expect(m!.query).toBe('110mm PVC Sewer Pipe 6m');
    });

    it('does NOT match generic trade work that merely shares a word', () => {
        // "brickwork" is work, not the catalogue's "Clay Stock Brick NFP".
        expect(matchCatalogueProduct('Half brick wall in stretcher bond')).toBeNull();
        expect(matchCatalogueProduct(
            'Brickwork in clay bricks in cement mortar class II in foundations',
        )).toBeNull();
    });

    it('does NOT match prose or unrelated items', () => {
        expect(matchCatalogueProduct('View site')).toBeNull();
        expect(matchCatalogueProduct(
            'The contractor shall allow for all necessary plant',
        )).toBeNull();
        expect(matchCatalogueProduct('38 x 38mm Trimmers around light fittings')).toBeNull();
    });

    it('requires size tokens to agree — a different size is a different product', () => {
        expect(matchCatalogueProduct('160mm PVC sewer pipe 6m')).toBeNull();
    });
});
