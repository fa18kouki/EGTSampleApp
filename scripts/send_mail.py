import smtplib
from email.mime.text import MIMEText

smtp_host = "sv8259.xserver.jp"
smtp_port = 465
smtp_account = "k.kanno@egt-group.jp "
smtp_password = "egt00000"

to_address = "kouki2718@outlook.jp"
from_address = "k.kanno@egt-group.jp"

text = "本文"
subject = "メールのタイトル"

msg = MIMEText(text, "plain", "utf-8")
msg["Subject"] = subject
msg["From"] = from_address
msg["To"] = to_address

with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as smtp:
    smtp.login(smtp_account, smtp_password)
    smtp.send_message(msg)
    smtp.quit()