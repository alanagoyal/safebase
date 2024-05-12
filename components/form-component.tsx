"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import Confetti from "react-confetti"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn, formDescriptions } from "@/lib/utils"

import AuthRefresh from "./auth-refresh"
import { EntitySelector } from "./entity-selector"
import { Share } from "./share"
import { Button } from "./ui/button"
import { Calendar } from "./ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Textarea } from "./ui/textarea"
import { toast } from "./ui/use-toast"

const FormComponentSchema = z.object({
  companyName: z.string().optional(),
  fundName: z.string().optional(),
  fundByline: z.string().optional(),
  purchaseAmount: z.string({ required_error: "Purchase amount is required" }),
  type: z.enum(["valuation-cap", "discount", "mfn", ""]),
  valuationCap: z.string().optional(),
  discount: z.string().optional(),
  stateOfIncorporation: z.string({
    required_error: "State of incorporation is required",
  }),
  date: z.date({ required_error: "Date is required" }),
  investorName: z.string().optional(),
  investorTitle: z.string().optional(),
  investorEmail: z.string().optional(),
  fundStreet: z.string().optional(),
  fundCityStateZip: z.string().optional(),
  founderName: z.string().optional(),
  founderTitle: z.string().optional(),
  founderEmail: z.string().optional(),
  companyStreet: z.string().optional(),
  companyCityStateZip: z.string().optional(),
})

type FormComponentValues = z.infer<typeof FormComponentSchema>

export default function FormComponent({ userData }: { userData: any }) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(parseInt(searchParams.get("step") || "1"))
  const [investmentId, setInvestmentId] = useState<string | null>(
    searchParams.get("id") || null
  )
  const [showConfetti, setShowConfetti] = useState(false)
  const [entities, setEntities] = useState<any[]>([])
  const [selectedEntity, setSelectedEntity] = useState("")
  const isFormLocked = searchParams.get("sharing") === "true"

  const form = useForm<FormComponentValues>({
    resolver: zodResolver(FormComponentSchema),
    defaultValues: {
      companyName: "",
      fundName: "",
      fundByline: "",
      purchaseAmount: "",
      type: "",
      valuationCap: "",
      discount: "",
      stateOfIncorporation: "",
      date: new Date(),
      investorName: "",
      investorTitle: "",
      investorEmail: "",
      fundStreet: "",
      fundCityStateZip: "",
      founderName: "",
      founderTitle: "",
      founderEmail: "",
      companyStreet: "",
      companyCityStateZip: "",
    },
  })

  useEffect(() => {
    if (userData) {
      fetchEntities()
    }
  }, [userData])

  // Update the URL when the step changes, including sharing state if applicable
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set("step", step.toString())
    if (investmentId) {
      newSearchParams.set("id", investmentId)
      fetchInvestmentDetails(investmentId)
    }
    if (isFormLocked) {
      newSearchParams.set("sharing", "true")
    }
    router.push(`?${newSearchParams.toString()}`)
  }, [step, router, investmentId, isFormLocked])

  async function fetchInvestmentDetails(investmentId: string) {
    const { data: dataIncorrectlyTyped, error } = await supabase
      .from("investments")
      .select(
        `
        purchase_amount,
        investment_type,
        valuation_cap,
        discount,
        date,
        founder:users!founder_id (name, title, email),
        company:companies (name, street, city_state_zip, state_of_incorporation),
        investor:users!investor_id (name, title, email),
        fund:funds (name, byline, street, city_state_zip)
      `
      )
      .eq("id", investmentId)
      .single()

    if (error) {
      console.error("Error fetching investment details:", error)
      return
    }

    if (dataIncorrectlyTyped) {
      const data = dataIncorrectlyTyped as any

      form.reset({
        companyName: data.company?.name || "",
        fundName: data.fund?.name || "",
        fundByline: data.fund?.byline || "",
        purchaseAmount: data.purchase_amount || "",
        type: data.investment_type || "valuation-cap",
        valuationCap: data.valuation_cap || "",
        discount: data.discount || "",
        stateOfIncorporation: data.company?.state_of_incorporation || "",
        date: data.date ? new Date(data.date) : new Date(),
        investorName: data.investor?.name || "",
        investorTitle: data.investor?.title || "",
        investorEmail: data.investor?.email || "",
        fundStreet: data.fund?.street || "",
        fundCityStateZip: data.fund?.city_state_zip || "",
        founderName: data.founder?.name || "",
        founderTitle: data.founder?.title || "",
        founderEmail: data.founder?.email || "",
        companyStreet: data.company?.street || "",
        companyCityStateZip: data.company?.city_state_zip || "",
      })
    }
  }

  async function fetchEntities() {
    const { data: fundData, error: fundError } = await supabase
      .from("funds")
      .select()
      .eq("investor_id", userData.id)

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select()
      .eq("founder_id", userData.id)

    if (!fundError && !companyError) {
      const typedFundData = fundData.map((fund) => ({ ...fund, type: "fund" }))
      const typedCompanyData = companyData.map((company) => ({
        ...company,
        type: "company",
      }))
      setEntities([...typedFundData, ...typedCompanyData])
    }
  }

  async function onSubmit(values: FormComponentValues) {
    const formattedDate = formatSubmissionDate(values.date)
    const templateFileName = selectTemplate(values.type)
    const doc = await loadAndPrepareTemplate(
      templateFileName,
      values,
      formattedDate
    )
    downloadDocument(doc, values.type)
    await processInvestment(values, null, null, null, null)

    setShowConfetti(true)
    setTimeout(() => {
      setShowConfetti(false)
    }, 10000)
    toast({
      title: "Congratulations!",
      description:
        "Your SAFE agreement has been generated and can be found in your Downloads",
    })
  }

  async function processInvestorDetails(values: FormComponentValues) {
    try {
      let investorData = await supabase
        .from("users")
        .select("id")
        .eq("email", values.investorEmail)

      if (investorData.data && investorData.data.length > 0) {
        return investorData.data[0].id
      } else {
        const { data, error } = await supabase
          .from("users")
          .insert({
            name: values.investorName,
            title: values.investorTitle,
            email: values.investorEmail,
          })
          .select("id")
        if (error) throw error
        return data[0].id
      }
    } catch (error) {
      console.error("Error processing investor details:", error)
      return null
    }
  }

  async function processFundDetails(
    values: FormComponentValues,
    investorId: string
  ) {
    try {
      // Insert fund
      const fundData = {
        name: values.fundName,
        byline: values.fundByline,
        street: values.fundStreet,
        city_state_zip: values.fundCityStateZip,
        investor_id: investorId,
      }
      const { data: existingFund, error: existingFundError } = await supabase
        .from("funds")
        .select("id")
        .eq("name", values.fundName)
        .eq("investor_id", investorId)

      if (existingFund && existingFund.length > 0) {
        const { error: updateError } = await supabase
          .from("funds")
          .update(fundData)
          .eq("id", existingFund[0].id)
        if (updateError) throw updateError
        return existingFund[0].id
      } else {
        const { data: newFund, error: newFundError } = await supabase
          .from("funds")
          .insert(fundData)
          .select()
        if (newFundError) throw newFundError
        return newFund[0].id
      }
    } catch (error) {
      console.error("Error processing fund details:", error)
    }
  }

  async function processFounderDetails(values: FormComponentValues) {
    try {
      // Check if the founder already exists
      let founderData = await supabase
        .from("users")
        .select("id")
        .eq("email", values.founderEmail)

      if (founderData.data && founderData.data.length > 0) {
        return founderData.data[0].id
      } else {
        const { data, error } = await supabase
          .from("users")
          .insert({
            name: values.founderName,
            title: values.founderTitle,
            email: values.founderEmail,
          })
          .select("id")
        if (error) throw error
        return data[0].id
      }
    } catch (error) {
      console.error("Error processing founder details:", error)
    }
  }

  async function processCompanyDetails(
    values: FormComponentValues,
    founderId: string
  ) {
    try {
      // Insert company
      const companyData = {
        name: values.companyName,
        street: values.companyStreet,
        city_state_zip: values.companyCityStateZip,
        state_of_incorporation: values.stateOfIncorporation,
        founder_id: founderId,
      }
      const { data: existingCompany, error: existingCompanyError } =
        await supabase
          .from("companies")
          .select("id")
          .eq("name", values.companyName)
          .eq("founder_id", founderId)

      if (existingCompany && existingCompany.length > 0) {
        const { error: updateError } = await supabase
          .from("companies")
          .update(companyData)
          .eq("id", existingCompany[0].id)
        if (updateError) throw updateError
        return existingCompany[0].id
      } else {
        const { data: newCompany, error: newCompanyError } = await supabase
          .from("companies")
          .insert(companyData)
          .select()
        if (newCompanyError) throw newCompanyError
        return newCompany[0].id
      }
    } catch (error) {
      console.error("Error processing company details:", error)
    }
  }

  async function processInvestment(
    values: FormComponentValues,
    investorId: string | null,
    fundId: string | null,
    founderId: string | null,
    companyId: string | null
  ) {
    // Insert into investments table
    try {
      // Prepare investment data with non-null values
      const investmentData = {
        ...(founderId && { founder_id: founderId }),
        ...(companyId && { company_id: companyId }),
        ...(investorId && { investor_id: investorId }),
        ...(fundId && { fund_id: fundId }),
        purchase_amount: values.purchaseAmount,
        investment_type: values.type,
        ...(values.valuationCap && { valuation_cap: values.valuationCap }),
        ...(values.discount && { discount: values.discount }),
        date: values.date,
        created_by: userData.auth_id,
      }

      // If hasn't been added to investments table, add it
      if (!investmentId) {
        const { data: investmentInsertData, error: investmentInsertError } =
          await supabase.from("investments").insert(investmentData).select()
        if (investmentInsertError) throw investmentInsertError
        setInvestmentId(investmentInsertData[0].id)
      } else {
        // If it has been added, update it
        const { data: investmentUpdateData, error: investmentUpdateError } =
          await supabase
            .from("investments")
            .upsert({ ...investmentData, id: investmentId })
            .select()
        if (investmentUpdateError) throw investmentUpdateError
        setInvestmentId(investmentUpdateData[0].id)
      }
    } catch (error) {
      console.error("Error processing investment details:", error)
    }
  }

  function formatSubmissionDate(date: Date): string {
    const monthName = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(date)
    const day = date.getDate()
    const year = date.getFullYear()
    const suffix = getNumberSuffix(day)
    return `${monthName} ${day}${suffix}, ${year}`
  }

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

  function selectTemplate(type: string): string {
    switch (type) {
      case "valuation-cap":
        return "SAFE-Valuation-Cap.docx"
      case "discount":
        return "SAFE-Discount.docx"
      case "mfn":
        return "SAFE-MFN.docx"
      default:
        return "" // Default case to handle unexpected types
    }
  }

  async function loadAndPrepareTemplate(
    templateFileName: string,
    values: FormComponentValues,
    formattedDate: string
  ): Promise<Docxtemplater> {
    const response = await fetch(`/${templateFileName}`)
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    const doc = new Docxtemplater().loadZip(zip)
    doc.setData({
      company_name: values.companyName,
      investing_entity_name: values.fundName,
      byline: values.fundByline || "",
      purchase_amount: values.purchaseAmount,
      valuation_cap: values.valuationCap || "",
      discount: values.discount
        ? (100 - Number(values.discount)).toString()
        : "",
      state_of_incorporation: values.stateOfIncorporation,
      date: formattedDate,
      investor_name: values.investorName,
      investor_title: values.investorTitle,
      investor_email: values.investorEmail,
      investor_address_1: values.fundStreet,
      investor_address_2: values.fundCityStateZip,
      founder_name: values.founderName,
      founder_title: values.founderTitle,
      founder_email: values.founderEmail || "",
      company_address_1: values.companyStreet || "",
      company_address_2: values.companyCityStateZip || "",
    })
    doc.render()
    return doc
  }

  function downloadDocument(doc: Docxtemplater, type: string) {
    const updatedContent = doc.getZip().generate({ type: "blob" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(updatedContent)
    link.download =
      type === "valuation-cap"
        ? "YC-SAFE-Valuation-Cap.docx"
        : type === "discount"
        ? "YC-SAFE-Discount.docx"
        : "YC-SAFE-MFN.docx"
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(link.href)
    }, 100)
  }

  async function handleSelectChange(value: string) {
    setSelectedEntity(value)

    const selectedEntityDetails = entities.find((entity) => entity.id === value)

    if (selectedEntityDetails.type === "fund") {
      form.reset({
        ...form.getValues(),
        fundName: selectedEntityDetails.name,
        fundByline: selectedEntityDetails.byline,
        fundStreet: selectedEntityDetails.street,
        fundCityStateZip: selectedEntityDetails.city_state_zip,
      })

      const { data: investorData, error: investorError } = await supabase
        .from("users")
        .select("name, title, email")
        .eq("id", selectedEntityDetails.investor_id)
      if (investorError) throw investorError
      form.reset({
        ...form.getValues(),
        investorName: investorData[0].name,
        investorTitle: investorData[0].title,
        investorEmail: investorData[0].email,
      })
    } else if (selectedEntityDetails.type === "company") {
      form.reset({
        ...form.getValues(),
        companyName: selectedEntityDetails.name,
        companyStreet: selectedEntityDetails.street,
        companyCityStateZip: selectedEntityDetails.city_state_zip,
        stateOfIncorporation: selectedEntityDetails.state_of_incorporation,
      })
      const { data: founderData, error: founderError } = await supabase
        .from("users")
        .select("name, title, email")
        .eq("id", selectedEntityDetails.founder_id)
      if (founderError) throw founderError
      form.reset({
        ...form.getValues(),
        founderName: founderData[0].name,
        founderTitle: founderData[0].title,
        founderEmail: founderData[0].email,
      })
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen py-2 w-2/3">
      <AuthRefresh />
      {showConfetti && <Confetti />}
      <h1 className="text-4xl font-bold mb-4">Get Started</h1>
      <h3 className="text-sm text-gray-500 mb-4">
        Your next unicorn investment is just a few clicks away
      </h3>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 w-full"
        >
          {step === 1 && (
            <>
              <div className="pt-4">
                <Label className="text-md font-bold">Investor Details</Label>
              </div>
              <EntitySelector
                entities={entities}
                selectedEntity={selectedEntity}
                onSelectChange={handleSelectChange}
                entityType="fund"
              />
              <FormField
                control={form.control}
                name="fundName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.fundName}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fundByline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Byline (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.fundByline}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fundStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.fundStreet}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fundCityStateZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City, State, Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.fundCityStateZip}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4">
                <Label className="text-md font-bold">Signatory Details</Label>
              </div>
              <FormField
                control={form.control}
                name="investorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investor Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.investorName}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investorTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investor Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.investorTitle}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="investorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investor Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.investorEmail}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={async () => {
                  const values = form.getValues()
                  const investorId = await processInvestorDetails(values)
                  const fundId = await processFundDetails(values, investorId)
                  await processInvestment(
                    values,
                    investorId,
                    fundId,
                    null,
                    null
                  )
                  if (!isFormLocked) {
                    setStep(2) // Move to the next step only after processing is complete
                  }
                }}
              >
                {isFormLocked ? "Save" : "Next"}
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="pt-4 flex justify-between">
                <Label className="text-md font-bold">Company Details</Label>
                <Share
                  idString={`${window.location.origin}/new?id=${investmentId}&step=${step}&sharing=true`}
                />
              </div>
              <EntitySelector
                entities={entities}
                selectedEntity={selectedEntity}
                onSelectChange={handleSelectChange}
                entityType="company"
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.companyName}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.companyStreet}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyCityStateZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City, State, Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.companyCityStateZip}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateOfIncorporation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State of Incorporation</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.stateOfIncorporation}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4">
                <Label className="text-md font-bold">Signatory Details</Label>
              </div>
              <FormField
                control={form.control}
                name="founderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Founder Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.founderName}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="founderTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Founder Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.founderTitle}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="founderEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Founder Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.founderEmail}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={async () => {
                    const values = form.getValues()
                    const founderId = await processFounderDetails(values)
                    const companyId = await processCompanyDetails(
                      values,
                      founderId
                    )
                    await processInvestment(
                      values,
                      null,
                      null,
                      founderId,
                      companyId
                    )
                    if (!isFormLocked) {
                      setStep(3) // Move to the next step only after processing is complete
                    } else {
                      // Confetti and toast
                      setShowConfetti(true)
                      setTimeout(() => {
                        setShowConfetti(false)
                      }, 10000)
                      toast({
                        title: "Congratulations!",
                        description:
                          "Your information has been saved. You'll receive an email with the next steps shortly.",
                      })
                    }
                  }}
                >
                  {isFormLocked ? "Save" : "Next"}
                </Button>
                {!isFormLocked ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => window.close()}
                  >
                    Exit
                  </Button>
                )}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="pt-4">
                <Label className="text-md font-bold">Deal Terms</Label>
              </div>
              <FormField
                control={form.control}
                name="purchaseAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Amount</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={Number(
                          field.value.replace(/,/g, "")
                        ).toLocaleString()}
                        onChange={(event) => {
                          const value = event.target.value
                            .replace(/\D/g, "")
                            .replace(/,/g, "")
                          field.onChange(Number(value).toLocaleString())
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {formDescriptions.purchaseAmount}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Placement</SelectLabel>
                          <SelectItem value="valuation-cap">
                            Valuation Cap
                          </SelectItem>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="mfn">MFN</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {formDescriptions.investmentType}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("type") === "valuation-cap" && (
                <FormField
                  control={form.control}
                  name="valuationCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valuation Cap</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={Number(
                            field.value?.replace(/,/g, "")
                          ).toLocaleString()}
                          onChange={(event) => {
                            const value = event.target.value
                              .replace(/\D/g, "")
                              .replace(/,/g, "")
                            field.onChange(Number(value).toLocaleString())
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {formDescriptions.valuationCap}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch("type") === "discount" && (
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        {formDescriptions.discount}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>{formDescriptions.date}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full">
                  Submit
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  )
}
