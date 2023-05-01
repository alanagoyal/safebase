"use client"

import { useRouter } from "next/navigation"

import { Button, buttonVariants } from "@/components/ui/button"

export default function IndexPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto my-48 flex-grow">
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
          <div className="flex max-w-[980px] flex-col items-start gap-2">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
              Skip the paperwork
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              Give us a few details about your startup and we&apos;ll generate a
              fully customized YC Post-Money SAFE for you
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              className="bg-base-case-pink-500 text-white h-15 w-64 px-8 py-4 rounded-md text-xl"
              onClick={() => router.push("/new")}
              style={{
                background: "linear-gradient(19deg, #21D4FD 0%, #B721FF 100%)",
              }}
            >
              Get Started
            </Button>
          </div>
        </section>
      </main>

      <footer className="text-center py-8">
        {" "}
        <div className="text-center mb-2">
          <p>
            Built with <span className="text-red-500">❤️</span> by{" "}
            <a
              href="https://twitter.com/alanaagoyal/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Alana Goyal
            </a>{" "}
          </p>
        </div>
      </footer>
    </div>
  )
}
