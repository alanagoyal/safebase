"use client"

import Link from "next/link"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Icons } from "./icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

export default function Investments({ investments }: { investments: any }) {
  type InvestmentTypeKey = "valuation-cap" | "discount" | "mfn"
  const formatInvestmentType = (type: InvestmentTypeKey | string) => {
    const investmentTypes: Record<InvestmentTypeKey, string> = {
      "valuation-cap": "Valuation Cap",
      discount: "Discount",
      mfn: "MFN",
    }
    return investmentTypes[type as InvestmentTypeKey] || type
  }
  return (
    <div className="flex flex-col items-center min-h-screen py-2 w-2/3">
      <h1 className="text-2xl font-bold mb-8">Investments</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Investor</TableHead>
            <TableHead>Founder</TableHead>
            <TableHead>Investment Type</TableHead>
            <TableHead>Purchase Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map((investment: any) => (
            <TableRow key={investment.id}>
              <TableCell>
                <Link href={`/new?id=${investment.id}`}>
                  {investment.company ? (
                    investment.company.name
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-red-500">
                            <Icons.info className="inline-block mr-2" />
                            Company Name Missing
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Fill in company information or share the link with the
                          founder
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Link>
              </TableCell>
              <TableCell>
                {investment.investor
                  ? `${investment.investor.name} (${investment.investor.email})`
                  : "N/A"}
              </TableCell>
              <TableCell>
                {investment.founder
                  ? `${investment.founder.name} (${investment.founder.email})`
                  : "N/A"}
              </TableCell>
              <TableCell>
                {formatInvestmentType(investment.investment_type)}
              </TableCell>
              <TableCell>
                {investment.purchase_amount
                  ? `$${investment.purchase_amount}`
                  : "N/A"}
              </TableCell>
              <TableCell>
                {new Date(investment.date).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
