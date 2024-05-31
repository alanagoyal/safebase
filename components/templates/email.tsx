import * as React from "react"

interface EmailTemplateProps {
  investmentData: any
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  investmentData,
}) => (
  <div>
    <p>Hi {investmentData.founder.name.split(' ')[0]},</p>
    <p>
      {investmentData.fund.name} has shared a SAFE agreement with you. Please
      find the document attached to this email.
    </p>
  </div>
)