$passed = 0
$failed = 0

function Assert-Test($condition, $name, $details = "") {
    if ($condition) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "[FAIL] $name - $details" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host "================================================================"
Write-Host "ZEBALPHA DYNAMIC DELIVERY ESTIMATION TEST SUITE"
Write-Host "================================================================`n"

# 1. PIN Code Validation Tests
Write-Host "--- 1. PIN Code Format Validation ---"
$pinRegex = '^[1-9][0-9]{5}$'
Assert-Test ("700001" -match $pinRegex) "1.1: Valid PIN 700001 passes"
Assert-Test ("110001" -match $pinRegex) "1.2: Valid PIN 110001 passes"
Assert-Test ("741254" -match $pinRegex) "1.3: Valid PIN 741254 passes"
Assert-Test ("012345" -notmatch $pinRegex) "1.4: PIN starting with 0 is rejected"
Assert-Test ("12345" -notmatch $pinRegex) "1.5: 5-digit PIN is rejected"
Assert-Test ("1234567" -notmatch $pinRegex) "1.6: 7-digit PIN is rejected"
Assert-Test ("70000A" -notmatch $pinRegex) "1.7: Alphanumeric PIN is rejected"
Assert-Test ("" -notmatch $pinRegex) "1.8: Empty PIN is rejected"

# 2. Dynamic Calendar & Date Calculations
Write-Host "`n--- 2. Dynamic Date Math & Formatting ---"

# Simulation function mirroring calculateDeliveryEstimate
function Get-DeliveryEstimate($courier, $dispatchDays = 0, $dispatchCutoffHour = 16, $baseDate) {
    if (-not $courier) {
        return @{ has_estimate = $false; message = "No courier option provided." }
    }

    $istHour = $baseDate.Hour
    $totalBuffer = [int]$dispatchDays
    if ($istHour -ge $dispatchCutoffHour) {
        $totalBuffer += 1
    }

    $finalDate = $null
    $transitDays = $null
    $method = $null

    if ($courier.etd) {
        try {
            $parsedEtd = [DateTime]::Parse($courier.etd)
            $finalDate = $parsedEtd.AddDays($totalBuffer)
            $method = "CARRIER_ETD"
            $diff = ($finalDate - $baseDate).TotalDays
            $transitDays = [Math]::Max(1, [Math]::Round($diff))
        } catch {}
    }

    if (-not $finalDate -and $courier.estimated_delivery_days) {
        $rawDays = [int]$courier.estimated_delivery_days
        if ($rawDays -gt 0) {
            $transitDays = $rawDays
            $finalDate = $baseDate.AddDays($totalBuffer + $rawDays)
            $method = "COURIER_TRANSIT_DAYS"
        }
    }

    if (-not $finalDate) {
        return @{
            has_estimate = $false
            serviceable = $true
            message = "Delivery estimate is currently unavailable from courier."
        }
    }

    # Format dynamically: e.g. "30 Oct, Fri"
    $day = $finalDate.Day.ToString()
    $month = $finalDate.ToString("MMM", [System.Globalization.CultureInfo]::InvariantCulture)
    $weekday = $finalDate.ToString("ddd", [System.Globalization.CultureInfo]::InvariantCulture)
    $formattedDate = "$day $month, $weekday"

    return @{
        has_estimate = $true
        serviceable = $true
        delivery_date = $finalDate.ToString("yyyy-MM-ddTHH:mm:ssZ")
        formatted_date = $formattedDate
        display_text = "Delivery by $formattedDate"
        day = $day
        month = $month
        weekday = $weekday
        transit_days = $transitDays
        dispatch_buffer_days = $totalBuffer
        courier_name = $courier.courier_name
        calculation_method = $method
    }
}

# Test 2.1: Carrier ETD verification
$c1 = @{
    courier_name = "Xpressbees Air"
    courier_company_id = 33
    etd = "2026-10-30"
    estimated_delivery_days = 4
}
$base1 = [DateTime]::Parse("2026-10-26T10:00:00")
$res1 = Get-DeliveryEstimate $c1 0 16 $base1
Assert-Test ($res1.has_estimate -eq $true) "2.1: Carrier ETD estimate succeeds"
Assert-Test ($res1.day -eq "30") "2.2: Day matches 30"
Assert-Test ($res1.month -eq "Oct") "2.3: Month matches Oct"
Assert-Test ($res1.weekday -eq "Fri") "2.4: Weekday is Fri"
Assert-Test ($res1.display_text -eq "Delivery by 30 Oct, Fri") "2.5: Display text matches format"

# Test 3: Cutoff hour buffer (+1 day after 4 PM)
$baseCutoff = [DateTime]::Parse("2026-10-22T17:30:00") # 5:30 PM (after 16:00 cutoff)
$c2 = @{
    courier_name = "Delhivery Surface"
    estimated_delivery_days = 3
}
$resCutoff = Get-DeliveryEstimate $c2 0 16 $baseCutoff
# Oct 22 + 1 (cutoff) + 3 (transit) = Oct 26
Assert-Test ($resCutoff.has_estimate -eq $true) "3.1: Estimate with cutoff succeeds"
Assert-Test ($resCutoff.dispatch_buffer_days -eq 1) "3.2: Cutoff buffer +1 applied"
Assert-Test ($resCutoff.day -eq "26") "3.3: Day rolled over to 26"
Assert-Test ($resCutoff.weekday -eq "Mon") "3.4: Weekday is Mon"

# Test 4: Month rollover (Oct 30 + 3 days -> Nov 2)
$baseMonth = [DateTime]::Parse("2026-10-30T10:00:00")
$cMonth = @{
    courier_name = "BlueDart Express"
    estimated_delivery_days = 3
}
$resMonth = Get-DeliveryEstimate $cMonth 0 16 $baseMonth
Assert-Test ($resMonth.day -eq "2") "4.1: Month rollover to day 2"
Assert-Test ($resMonth.month -eq "Nov") "4.2: Month rollover to Nov"
Assert-Test ($resMonth.weekday -eq "Mon") "4.3: Weekday is Mon"

# Test 5: Year rollover (Dec 30 2026 + 4 days -> Jan 3 2027)
$baseYear = [DateTime]::Parse("2026-12-30T10:00:00")
$cYear = @{
    courier_name = "DTDC Priority"
    estimated_delivery_days = 4
}
$resYear = Get-DeliveryEstimate $cYear 0 16 $baseYear
Assert-Test ($resYear.day -eq "3") "5.1: Year rollover to day 3"
Assert-Test ($resYear.month -eq "Jan") "5.2: Year rollover to Jan"
Assert-Test ($resYear.weekday -eq "Sun") "5.3: Weekday is Sun"

# Test 6: Leap year (Feb 27 2028 + 2 days -> Feb 29 2028)
$baseLeap = [DateTime]::Parse("2028-02-27T10:00:00")
$cLeap = @{
    courier_name = "Shadowfax Quick"
    estimated_delivery_days = 2
}
$resLeap = Get-DeliveryEstimate $cLeap 0 16 $baseLeap
Assert-Test ($resLeap.day -eq "29") "6.1: Leap day 29 reached"
Assert-Test ($resLeap.month -eq "Feb") "6.2: Month is Feb"
Assert-Test ($resLeap.weekday -eq "Tue") "6.3: Weekday is Tue"

# Test 7: Missing Transit Data (Zero-Hardcoding Policy)
$cMissing = @{
    courier_name = "Carrier Without Transit Info"
    etd = $null
    estimated_delivery_days = $null
}
$resMissing = Get-DeliveryEstimate $cMissing 0 16 $base1
Assert-Test ($resMissing.has_estimate -eq $false) "7.1: Missing transit info returns has_estimate: false"
Assert-Test ($null -eq $resMissing.delivery_date) "7.2: Never invents fake delivery date"
Assert-Test ($null -eq $resMissing.display_text) "7.3: Never produces fabricated display text"

# 8. Live Integration Test with Supabase & Shiprocket
Write-Host "`n--- 8. Live Database & Shiprocket Integration ---"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}
$base = "https://qjpahzstldiatfbutvfc.supabase.co/rest/v1"

try {
    # 8.1 Fetch actual product
    $prods = Invoke-RestMethod -Uri "$base/products?select=id,name,seller_id,stock,status,specifications&limit=1" -Headers $headers -Method Get
    Assert-Test ($prods.Count -gt 0) "8.1: Real product retrieved from database"
    $prod = $prods[0]
    
    # 8.2 Resolve real seller pickup pincode
    $pickupLocs = Invoke-RestMethod -Uri "$base/seller_pickup_locations?seller_id=eq.$($prod.seller_id)&is_active=eq.true&order=is_default.desc&limit=1" -Headers $headers -Method Get
    $realPickupPin = ""
    if ($pickupLocs.Count -gt 0) {
        $realPickupPin = $pickupLocs[0].pincode
    } else {
        $sellers = Invoke-RestMethod -Uri "$base/sellers?id=eq.$($prod.seller_id)&limit=1" -Headers $headers -Method Get
        if ($sellers.Count -gt 0) { $realPickupPin = $sellers[0].pincode }
    }
    Assert-Test ($realPickupPin.Length -eq 6) "8.2: Real seller pickup pincode resolved: $realPickupPin"

    # 8.3 Call Shiprocket for live serviceability
    $authBody = @{
        email = "zebalpha7@gmail.com"
        password = "BjI^X9AiKvlHj7*QQ^xoZAH%yRj9MjGo"
    } | ConvertTo-Json
    $authRes = Invoke-RestMethod -Uri "https://apiv2.shiprocket.in/v1/external/auth/login" -Method Post -Body $authBody -ContentType "application/json"
    Assert-Test ($authRes.token.Length -gt 20) "8.3: Real Shiprocket token obtained"

    $destPin = "110001"
    $srHeaders = @{
        "Authorization" = "Bearer $($authRes.token)"
        "Content-Type" = "application/json"
    }
    $servRes = Invoke-RestMethod -Uri "https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=$realPickupPin&delivery_postcode=$destPin&weight=0.5&cod=0" -Headers $srHeaders -Method Get
    Assert-Test ($servRes.status -eq 200) "8.4: Shiprocket serviceability returned HTTP 200"
    Assert-Test ($servRes.data.available_courier_companies.Count -gt 0) "8.5: Found $($servRes.data.available_courier_companies.Count) serviceable couriers"

    $bestCourier = $servRes.data.available_courier_companies[0]
    $liveRes = Get-DeliveryEstimate $bestCourier 0 16 ([DateTime]::Now)
    Assert-Test ($liveRes.has_estimate -eq $true) "8.6: Live estimate calculated successfully"
    Write-Host ">>> LIVE RESULT: $($liveRes.display_text) via $($liveRes.courier_name) (Transit: $($liveRes.transit_days) days, Rate: ₹$($bestCourier.rate))" -ForegroundColor Cyan
} catch {
    Assert-Test $false "8.x: Live integration failed" $_.Exception.Message
}

Write-Host "`n================================================================"
Write-Host "TEST SUMMARY: $passed PASSED, $failed FAILED"
Write-Host "================================================================"

if ($failed -gt 0) {
    exit 1
}
