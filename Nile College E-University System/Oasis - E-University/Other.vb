Imports System.Data.SqlClient

Module Other
    Public Function SpellNumber(ByVal MyNumber)
        Dim Pounds, Cent, Temp
        Dim DecimalPlace, Count

        Dim Place(9) As String
        Place(2) = " Thousand "
        Place(3) = " Million "
        Place(4) = " Billion "
        Place(5) = " Trillion "

        ' String representation of amount
        MyNumber = Trim(Str(MyNumber))

        ' Position of decimal place 0 if none
        DecimalPlace = InStr(MyNumber, ".")
        'Convert Cent and set MyNumber to dollar amount
        If DecimalPlace > 0 Then
            Cent = GetTens(Left(Mid(MyNumber, DecimalPlace + 1) & "00", 2))
            MyNumber = Trim(Left(MyNumber, DecimalPlace - 1))
        End If

        Count = 1
        Do While MyNumber <> ""
            Temp = GetHundreds(Right(MyNumber, 3))
            If Temp <> "" Then Pounds = Temp & Place(Count) & Pounds
            If Len(MyNumber) > 3 Then
                MyNumber = Left(MyNumber, Len(MyNumber) - 3)
            Else
                MyNumber = ""
            End If
            Count = Count + 1
        Loop

        Select Case Pounds
            Case ""
                Pounds = "No Pounds"
            Case "One"
                Pounds = "One Pound"
            Case Else
                Pounds = Pounds & " Pounds"
        End Select

        Select Case Cent
            Case ""
                Cent = " and No Cent"
            Case "One"
                Cent = " and One Cent"
            Case Else
                Cent = " and " & Cent & " Cent"
        End Select

        SpellNumber = Pounds & Cent
    End Function

    '*******************************************
    ' Converts a number from 100-999 into text *
    '*******************************************
    Function GetHundreds(ByVal MyNumber)
        Dim Result As String

        If Val(MyNumber) = 0 Then Exit Function
        MyNumber = Right("000" & MyNumber, 3)

        'Convert the hundreds place
        If Mid(MyNumber, 1, 1) <> "0" Then
            Result = GetDigit(Mid(MyNumber, 1, 1)) & " Hundred "
        End If

        'Convert the tens and ones place
        If Mid(MyNumber, 2, 1) <> "0" Then
            Result = Result & GetTens(Mid(MyNumber, 2))
        Else
            Result = Result & GetDigit(Mid(MyNumber, 3))
        End If

        GetHundreds = Result
    End Function

    '*********************************************
    ' Converts a number from 10 to 99 into text. *
    '*********************************************
    Function GetTens(ByVal TensText)
        Dim Result As String

        Result = ""           'null out the temporary function value
        If Val(Left(TensText, 1)) = 1 Then   ' If value between 10-19
            Select Case Val(TensText)
                Case 10 : Result = "Ten"
                Case 11 : Result = "Eleven"
                Case 12 : Result = "Twelve"
                Case 13 : Result = "Thirteen"
                Case 14 : Result = "Fourteen"
                Case 15 : Result = "Fifteen"
                Case 16 : Result = "Sixteen"
                Case 17 : Result = "Seventeen"
                Case 18 : Result = "Eighteen"
                Case 19 : Result = "Nineteen"
                Case Else
            End Select
        Else                                 ' If value between 20-99
            Select Case Val(Left(TensText, 1))
                Case 2 : Result = "Twenty "
                Case 3 : Result = "Thirty "
                Case 4 : Result = "Forty "
                Case 5 : Result = "Fifty "
                Case 6 : Result = "Sixty "
                Case 7 : Result = "Seventy "
                Case 8 : Result = "Eighty "
                Case 9 : Result = "Ninety "
                Case Else
            End Select
            Result = Result & GetDigit _
               (Right(TensText, 1))  'Retrieve ones place
        End If
        GetTens = Result
    End Function

    '*******************************************
    ' Converts a number from 1 to 9 into text. *
    '*******************************************
    Function GetDigit(ByVal Digit)
        Select Case Val(Digit)
            Case 1 : GetDigit = "One"
            Case 2 : GetDigit = "Two"
            Case 3 : GetDigit = "Three"
            Case 4 : GetDigit = "Four"
            Case 5 : GetDigit = "Five"
            Case 6 : GetDigit = "Six"
            Case 7 : GetDigit = "Seven"
            Case 8 : GetDigit = "Eight"
            Case 9 : GetDigit = "Nine"
            Case Else : GetDigit = ""
        End Select
    End Function

    Public Function GetProgramFees(ByVal Batch As String, ByVal Program As String) As Double
        Try
            Dim cmd As New SqlCommand("select ProgramFees from AnnualFees where Batch=N'" & Batch & "'And Program=N'" & Program & "' ", cnn4)
            Dim ProgramFees As Double

            cnn4.Open()
            ProgramFees = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return ProgramFees
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function
End Module
