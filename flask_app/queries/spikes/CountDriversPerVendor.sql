SELECT FARE.VENDOR AS Unternehmen, COUNT(FARE.DRIVER) AS Fahreranzahl
FROM NYCCAB.FARE_DOUBLE AS FARE
WHERE FARE.DRIVER > 10
GROUP BY FARE.VENDOR
ORDER BY Fahreranzahl DESC