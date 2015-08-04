SELECT FARE.VENDOR AS Unternehmen, COUNT(FARE.Total) AS Umsatz
FROM NYCCAB.FARE_DOUBLE AS FARE
WHERE FARE.DRIVER > 10
AND PICKUP_TIME BETWEEN '2013-4-1' AND '2013-4-30'
GROUP BY FARE.VENDOR