import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email_smtp(to_email, subject, message, from_email="smarttracker@example.com", smtp_server="smtp.gmail.com", smtp_port=587, smtp_user="", smtp_password=""):
    try:
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(message, "plain"))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login("kaoutarokayl4@gmail.com", "oehu savm etlo pycr")
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("Erreur d'envoi email:", e)
        return False