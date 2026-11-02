import taxTable from "../data/graduatedTaxTable.json";
import { peso } from "../lib/money";
import { graduatedTableReady, type Bracket } from "../lib/tax";

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Reference table for the graduated income tax rates. Data: data/graduatedTaxTable.json, supplied by the
 * consultant (OPEN FL-17). Until the consultant sends it the table is empty and this block says so instead of
 * showing rates typed from memory. Display only: it does not compute anyone's tax.
 */
export default function TaxTableReference() {
  const brackets = (taxTable as { brackets: Bracket[] }).brackets;
  const ready = graduatedTableReady();
  return (
    <section className="guide-stage tax-table-reference" aria-labelledby="tax-table-h">
      <h2 id="tax-table-h">Tax tables reference</h2>
      {!ready ? (
        <p className="hint">The graduated income tax table is being confirmed with our tax consultant and will be shown here once it is final. Confirm the current rates with the BIR or a tax professional.</p>
      ) : (
        <>
          <p>
            A sole proprietor on the graduated rates pays the rate for the bracket their <strong>net taxable income</strong> falls in. Each bracket applies only to the amount above its lower limit.
          </p>
          <div className="tax-table-wrap">
            <table className="tax-table">
              <caption className="visually-hidden">Graduated income tax rates for individuals</caption>
              <thead>
                <tr>
                  <th scope="col">Net taxable income</th>
                  <th scope="col">Tax rate</th>
                  <th scope="col">Plus tax of</th>
                  <th scope="col">Applies to the amount over</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((b) => (
                  <tr key={b.over}>
                    <td>{b.notOver === null ? `Over ${peso(b.over)}` : b.over === 0 ? `${peso(0)} to ${peso(b.notOver)}` : `Over ${peso(b.over)} up to ${peso(b.notOver)}`}</td>
                    <td>{b.rate === 0 ? "0% (exempt)" : percent(b.rate)}</td>
                    <td>{peso(b.plus)}</td>
                    <td>{b.excessOver === null ? "—" : peso(b.excessOver)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="hint">
        The 8% option is a separate choice: 8% of gross sales or receipts above ₱250,000, instead of the graduated rates. It is optional, only for gross sales or
        receipts below ₱3,000,000, and is in place of the graduated income tax and the 3% percentage tax. Confirm your eligibility with the BIR or a tax professional before filing.
      </p>
    </section>
  );
}
