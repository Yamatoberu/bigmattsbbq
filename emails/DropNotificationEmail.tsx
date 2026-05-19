import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
  Link,
  Preview
} from "@react-email/components";

interface DropNotificationEmailProps {
  subject: string;
  dropId?: string;
}

export function DropNotificationEmail({ subject, dropId }: DropNotificationEmailProps) {
  const orderUrl = dropId
    ? `https://bigmattsbbq.com/?drop=${encodeURIComponent(dropId)}`
    : "https://bigmattsbbq.com";

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: "#1a1a1a", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ color: "#f5f5f5", fontSize: "28px", fontWeight: 700, margin: "0 0 16px 0" }}>
            Big Matt&apos;s BBQ Drop is Live
          </Text>

          <Text style={{ color: "#d1d1d1", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px 0" }}>
            {subject}
          </Text>

          <Button href={orderUrl} style={{
              backgroundColor: "#c84b11",
              color: "#ffffff",
              padding: "14px 28px",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block"
            }}>
            Order Now
          </Button>

          <Hr style={{ borderColor: "#444444", margin: "32px 0 16px 0" }} />

          <Text style={{ color: "#888888", fontSize: "12px", lineHeight: "18px", margin: 0 }}>
            You received this because you signed up for drop notifications at bigmattsbbq.com.{" "}
            <Link
              href="{{{RESEND_UNSUBSCRIBE_URL}}}"
              style={{ color: "#888888", textDecoration: "underline" }}
            >
              Unsubscribe
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
