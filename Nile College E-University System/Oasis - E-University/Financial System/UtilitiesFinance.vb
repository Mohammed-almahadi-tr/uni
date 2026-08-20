Imports System.Data.SqlClient

Module UtilitiesFinance

    Public SelAcc1, SelAcc2, SelAcc3, SelAcc4, SelAcc5 As String

    Public Function GetMoveNo(ByVal Year As Integer) As Integer
        Try
            Dim MoveNo As Integer
            Dim cmdMoveNo As New SqlCommand("Select IsNull(Max(MoveNo),0) From Transactionees Where Year(TransDate)=" & Year.ToString, cnn1)

            cnn1.Open()
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Function GetDocSNo(ByVal DocType As String) As Integer
        Try
            Dim MoveNo As Integer
            Dim cmdMoveNo As New SqlCommand("Select Max(SNo) From Transactionees Where Transtype=N'" & DocType & "'", cnn1)

            cnn1.Open()
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Sub PrintBill(ByVal TransType As String, ByVal PaymentType As String, ByVal SNo As Integer)
        Try

            Dim StrSel As String
            If TransType = "Pay Voucher" Then
                StrSel = "Select * From Transactionees Where TransType=N'Pay Voucher' and PaymentType=N'" & PaymentType & "' and TotalValueIn<>0 and SNo=" & SNo

            ElseIf TransType = "Receipt Voucher" Then
                StrSel = "Select * From Transactionees Where TransType=N'Receipt Voucher' and PaymentType=N'" & PaymentType & "' and TotalValueOut<>0 and SNo=" & SNo
            End If

            Dim dap As New SqlDataAdapter(StrSel, cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactionees")

            If TransType = "Pay Voucher" Then
                Dim rpt As New PayVoucher
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()

            ElseIf TransType = "Receipt Voucher" Then
                Dim rpt As New ReceiptVoucher
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()
            End If


        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Sub PrintStudantReceipt(ByVal TransType As String, ByVal PaymentType As String, ByVal SNo As Integer)
        Try

            Dim StrSel As String
            If TransType = "Pay Voucher" Then
                StrSel = "Select * From Transactionees Where TransType=N'Pay Voucher' and PaymentType=N'" & PaymentType & "' and TotalValueIn<>0 and SNo=" & SNo

            ElseIf TransType = "Receipt Voucher" Then
                StrSel = "Select * From Transactionees Where TransType=N'Receipt Voucher' and PaymentType=N'" & PaymentType & "' and TotalValueOut<>0 and SNo=" & SNo
            End If

            Dim dap As New SqlDataAdapter(StrSel, cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactionees")

            If TransType = "Pay Voucher" Then
                Dim rpt As New PayVoucher
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()

            ElseIf TransType = "Receipt Voucher" Then
                Dim rpt As New ReceiptVoucher
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()
            End If


        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Sub PrintCheq(ByVal TransType As String, ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select CheqDate,Source DestName,Writting WrittenAmount,TotalValueOut Amount,TransDate " & _
                                          "From Transactionees Cheques Where Transtype=N'" & TransType & "' and SNo=" & SNo & _
                                          " and CheqDate Is Not Null", cnn)
            Dim das As New DataSet

            dap.Fill(das, "Cheques")

            Dim rpt As New Cheque
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Function GetBalancePack(ByVal Pack As String) As Double
        Try
            Dim Balance As Double
            Dim cmdBalance As New SqlCommand("Select Sum(TotalValueIn)-Sum(TotalValueOut) From Transactionees " & _
                                             "Where Package=N'" & Pack & "'", cnn1)

            cnn1.Open()
            Balance = CDbl(cmdBalance.ExecuteScalar.ToString)
            cnn1.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 0
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactionees Where Acc1=N'" & Acc1 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactionees Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactionees Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
                                      "' And Acc3=N'" & Acc3 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    'Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String, ByVal Acc4 As String) As Double
    '    Try
    '        Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
    '                                  "From Transactions Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
    '                                  "' And Acc3=N'" & Acc3 & "' And Acc4=N'" & Acc4 & "'", cnn4)
    '        Dim Balance As Double

    '        cnn4.Open()
    '        Balance = CDbl(cmd.ExecuteScalar)
    '        cnn4.Close()

    '        Return Balance
    '    Catch ex As Exception
    '        If cnn4.State = ConnectionState.Open Then
    '            cnn4.Close()
    '        End If
    '    End Try
    'End Function
    Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String, ByVal Acc4 As String, ByVal Acc5 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactionees Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
                                      "' And Acc3=N'" & Acc3 & "' And Acc4=N'" & Acc4 & "' And Acc5=N'" & Acc5 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Sub PrintVoucher(ByVal MoveNo As Integer, ByVal Year As Integer)
        Try
            Dim dap As New SqlDataAdapter("select * From Transactionees Where MoveNo=" & MoveNo & " and Year(TransDate)=" & Year, cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactionees")
            cnn.Close()

            Dim rpt As New Vouchers
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Public Function GetStudentFees(ByVal StudID As String) As String
        Try
            Dim Stdtutfee As String
            Dim cmd As New SqlCommand("Select TuitionFees1 From Registrations Where StudentIndex=N'" & StudID & "'", cnn2)

            cnn2.Open()
            Stdtutfee = cmd.ExecuteScalar
            cnn2.Close()

            Return Stdtutfee
        Catch ex As Exception
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            Return ""
        End Try
    End Function

    Public Function GetStudentName(ByVal StudID As String) As String
        Try
            Dim StudentName As String
            Dim cmd As New SqlCommand("Select IsNull(StudentName,N'') From StudentsProfiles Where StudentIndex=N'" & StudID & "'", cnn2)

            cnn2.Open()
            StudentName = cmd.ExecuteScalar
            cnn2.Close()

            Return StudentName
        Catch ex As Exception
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            Return ""
        End Try
    End Function

    Public Function GetStudentBalance(ByVal StudID As String, ByVal StudName As String) As Double
        Try
            Dim StudentBalance As Double
            Dim cmd As New SqlCommand("Select sum(TotalValueIn)-sum(TotalValueOut) as StudentBalance  From Transactionees Where StudID=N'" & StudID & "' AND StudName=N'" & StudName & "'", cnn2)
            ' Dim cmd As New SqlCommand("Select sum(TotalValueIn)-sum(TotalValueOut) as StudentBalance  From Registrations Where StudentIndex=N'" & StudID & "' AND StudentName=N'" & StudName & "'", cnn2)

            cnn2.Open()
            StudentBalance = CDbl(cmd.ExecuteScalar)
            cnn2.Close()

            Return StudentBalance
        Catch ex As Exception
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            ' Return ""
        End Try
    End Function
End Module
