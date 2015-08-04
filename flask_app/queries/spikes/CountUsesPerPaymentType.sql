SELECT FARE.PAYMENT_TYPE AS Bezahlungsart, COUNT(*) AS Anwendung
FROM NYCCAB.FARE AS FARE
WHERE FARE.DRIVER > 10
GROUP BY FARE.PAYMENT_TYPE
ORDER BY Anwendung DESC