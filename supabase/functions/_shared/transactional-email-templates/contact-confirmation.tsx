import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Mindmatter'
const BRAND_GOLD = '#c89a4a'
const BRAND_DARK = '#141210'
const TEXT_DIM = '#55575d'

interface ContactConfirmationProps {
  name?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, message }: ContactConfirmationProps) => {
  const firstName = name?.split(' ')[0]
  return (
    <Html lang="nb" dir="ltr">
      <Head />
      <Preview>Takk for din henvendelse til {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandLabel}>— {SITE_NAME.toUpperCase()}</Text>
          </Section>

          <Section style={card}>
            <Text style={eyebrow}>Forespørsel mottatt</Text>
            <Heading style={h1}>
              Takk{firstName ? `, ${firstName}` : ''}.
            </Heading>
            <Text style={lead}>
              Vi har mottatt henvendelsen din og tar kontakt innen <em style={italicGold}>én arbeidsdag</em>.
            </Text>

            <Hr style={hr} />

            <Text style={sectionLabel}>Hva skjer nå</Text>
            <Text style={text}>
              Adrian leser gjennom det du har skrevet og kommer tilbake med konkrete neste steg —
              eller en avtale for en uforpliktende prat på 30 minutter.
            </Text>

            {message ? (
              <>
                <Hr style={hr} />
                <Text style={sectionLabel}>Din beskjed</Text>
                <Text style={quote}>{message}</Text>
              </>
            ) : null}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Trenger du noe akutt? Send en e-post direkte til{' '}
              <Link href="mailto:adrian@mindmatter.no" style={link}>
                adrian@mindmatter.no
              </Link>
            </Text>
            <Text style={footerSmall}>
              {SITE_NAME} · mindmatter.no
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContactConfirmationEmail,
  subject: 'Takk for din henvendelse til Mindmatter',
  displayName: 'Bekreftelse — kontaktskjema',
  previewData: {
    name: 'Jane Doe',
    message: 'Vi sliter med å få oversikt over leveransene våre og lurer på om dere kan hjelpe.',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '40px 20px',
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
}
const header: React.CSSProperties = { padding: '0 0 24px' }
const brandLabel: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontSize: '11px',
  letterSpacing: '0.2em',
  color: BRAND_GOLD,
  margin: 0,
}
const card: React.CSSProperties = {
  border: `1px solid ${BRAND_GOLD}`,
  borderRadius: '4px',
  padding: '40px 36px',
  backgroundColor: '#fbf8f3',
}
const eyebrow: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontSize: '10px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: BRAND_GOLD,
  margin: '0 0 16px',
}
const h1: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '36px',
  fontWeight: 400,
  color: BRAND_DARK,
  lineHeight: 1.1,
  letterSpacing: '-0.015em',
  margin: '0 0 20px',
}
const lead: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: 1.6,
  color: BRAND_DARK,
  margin: '0 0 8px',
}
const italicGold: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontStyle: 'italic',
  color: BRAND_GOLD,
}
const sectionLabel: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontSize: '10px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: TEXT_DIM,
  margin: '0 0 10px',
}
const text: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.7,
  color: BRAND_DARK,
  margin: 0,
}
const quote: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.7,
  color: TEXT_DIM,
  fontStyle: 'italic',
  borderLeft: `2px solid ${BRAND_GOLD}`,
  paddingLeft: '14px',
  margin: 0,
  whiteSpace: 'pre-wrap',
}
const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e8e2d4',
  margin: '28px 0',
}
const footer: React.CSSProperties = { padding: '28px 8px 0' }
const footerText: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: 1.6,
  color: TEXT_DIM,
  margin: '0 0 12px',
}
const footerSmall: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontSize: '11px',
  letterSpacing: '0.15em',
  color: '#999999',
  margin: 0,
}
const link: React.CSSProperties = {
  color: BRAND_GOLD,
  textDecoration: 'underline',
}