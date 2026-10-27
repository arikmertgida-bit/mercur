// Credit lines as the order routes serialize them: amounts are plain numbers.
type SerializedCreditLine = { amount: number }

export const getTotalCreditLines = (creditLines: SerializedCreditLine[]) =>
  creditLines.reduce((acc, creditLine) => {
    acc = acc + creditLine.amount

    return acc
  }, 0)
