"use client"

import { useState } from "react"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import PizZipUtils from "pizzip/utils/index.js"
import toast, { Toaster } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Safe() {
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [dateOfIncorporation, setDate] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [investorName, setInvestorName] = useState("")
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [stateOfIncorporation, setStateOfIncorporation] = useState("")
  const [valuationCap, setValuationCap] = useState("")
  const [discount, setDiscount] = useState("")
  const [formStep, setFormStep] = useState(1)
  const [investmentType, setInvestmentType] = useState("")

  const resetForm = () => {
    setName("")
    setTitle("")
    setDate("")
    setCompanyName("")
    setInvestorName("")
    setPurchaseAmount("")
    setStateOfIncorporation("")
    setValuationCap("")
    setDiscount("")
    setFormStep(1)
    setInvestmentType("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Format date
    const date = new Date(dateOfIncorporation)
    const monthName = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(date)
    const day = date.getDate()
    const year = date.getFullYear()
    const suffix = getNumberSuffix(day)
    const formattedDate = `${monthName} ${day}${suffix}, ${year}`

    function getNumberSuffix(day: number): string {
      if (day >= 11 && day <= 13) {
        return "th"
      }
      switch (day % 10) {
        case 1:
          return "st"
        case 2:
          return "nd"
        case 3:
          return "rd"
        default:
          return "th"
      }
    }

    // Load the docx template based on the investment type
    let templateFileName = ""
    if (investmentType === "valuation-cap") {
      templateFileName = "SAFE-Valuation-Cap.docx"
    } else if (investmentType === "discount") {
      templateFileName = "SAFE-Discount.docx"
    }
    console.log(templateFileName)
    const response = await fetch(`/${templateFileName}`)
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)

    // Create a docxtemplater instance and load the zip
    const doc = new Docxtemplater().loadZip(zip)

    // Set the template variables
    doc.setData({
      company_name: companyName,
      investor_name: investorName,
      purchase_amount: Number(purchaseAmount).toLocaleString(),
      state_of_incorporation: stateOfIncorporation,
      valuation_cap: Number(valuationCap).toLocaleString(),
      date: formattedDate,
      name: name,
      title: title,
      discount: (100 - Number(discount)).toString(),
    })

    // Render the document
    doc.render()

    // Get the updated Word file content
    const updatedContent = doc.getZip().generate({ type: "blob" })

    // Create a download link and click it to start the download
    const link = document.createElement("a")
    link.href = URL.createObjectURL(updatedContent)
    link.download = "YC-Postmoney-SAFE-Modified.docx"
    link.click()

    // Clean up the download URL
    setTimeout(() => {
      URL.revokeObjectURL(link.href)
    }, 100)

    // Toast and reset form
    toast.success("Your SAFE has been generated!")
    resetForm()
  }

  return (
    <div className="flex flex-col items-center min-h-screen pt-20 py-2">
      <div>
        <Toaster />
      </div>
      <h1 className="text-4xl font-bold mb-4">Your Information</h1>
      <h3 className="text-base mb-10">
        We just need a few details to get started
      </h3>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-4"
      >
        {formStep === 1 && (
          <>
            <h2 className="text-xl font-bold mb-2">Company Details</h2>
            <Label htmlFor="name" className="font-bold">
              Name
            </Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Label htmlFor="title" className="font-bold">
              Title
            </Label>
            <Input
              type="text"
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Label htmlFor="company-name" className="font-bold">
              Company Name
            </Label>
            <Input
              type="text"
              id="company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Label htmlFor="state-of-incorporation" className="font-bold">
              State of Incorporation
            </Label>
            <Input
              type="text"
              id="state-of-incorporation"
              value={stateOfIncorporation}
              onChange={(event) => setStateOfIncorporation(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Button
              type="button"
              onClick={() => setFormStep(2)}
              className="bg-[#21D4FD] text-white font-bold py-2 px-4 rounded w-full"
            >
              Next
            </Button>
          </>
        )}
        {formStep === 2 && (
          <>
            <h2 className="text-xl font-bold mb-2">Investment Details</h2>
            <Label htmlFor="investor-name" className="font-bold">
              Investor Name
            </Label>
            <Input
              type="text"
              id="investor-name"
              value={investorName}
              onChange={(event) => setInvestorName(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Label htmlFor="purchase-amount" className="font-bold">
              Purchase Amount ($)
            </Label>
            <Input
              type="currency"
              id="purchase-amount"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Label htmlFor="investment-type" className="font-bold">
              Investment Type
            </Label>
            <select
              id="investment-type"
              value={investmentType}
              onChange={(event) => setInvestmentType(event.target.value)}
              className="border border-gray-400 rounded px-4 py-2 w-full"
            >
              <option value="" disabled>
                Choose an option
              </option>
              <option value="valuation-cap">Valuation Cap</option>
              <option value="discount">Discount</option>
            </select>
            {investmentType === "discount" ? (
              <>
                <Label htmlFor="discount" className="font-bold">
                  Discount (%)
                </Label>
                <Input
                  type="number"
                  id="discount"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  required
                  className="border border-gray-400 rounded px-4 py-2 w-full"
                />
              </>
            ) : (
              <>
                <Label htmlFor="valuation-cap" className="font-bold">
                  Valuation Cap ($)
                </Label>
                <Input
                  type="currency"
                  id="valuation-cap"
                  value={valuationCap}
                  onChange={(event) => setValuationCap(event.target.value)}
                  required
                  className="border border-gray-400 rounded px-4 py-2 w-full"
                />
              </>
            )}

            <Label htmlFor="date" className="font-bold">
              Date
            </Label>
            <Input
              type="date"
              id="date"
              value={dateOfIncorporation}
              onChange={(event) => setDate(event.target.value)}
              required
              className="border border-gray-400 rounded px-4 py-2 w-full"
            />
            <Button
              type="submit"
              className="bg-[#21D4FD] text-white font-bold py-2 px-4 rounded w-full"
            >
              Generate SAFE
            </Button>
            <Button
              type="button"
              onClick={() => setFormStep(1)}
              className="bg-slate-700 text-white font-bold py-2 px-4 rounded w-full"
            >
              Back
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
