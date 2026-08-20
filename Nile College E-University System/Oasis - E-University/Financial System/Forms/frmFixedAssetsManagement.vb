Imports System.Data.SqlClient

Public Class frmFixedAssets

    Sub FillAssetsList()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Acc2,Acc3,IsNull(DeprPerc,0) DeprPerc From Acc Where Acc1=N'Fixed Assets'" & _
                                      " and DeprPerc<>0", cnn)
            Dim Reader As SqlDataReader

            Me.GridAssetsList.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridAssetsList.Rows.Add(New String() {Reader.Item("Acc2"), Reader.Item("Acc3"), Reader.Item("DeprPerc")})
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillAssetsDepreciationList()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Acc2,Acc3,dbo.GetAccBalance(Acc2,Acc3,N'Value',GetDate())," & _
                                      "dbo.GetAccBalance(Acc2,Acc3,N'Depreciation',GetDate()),DeprPerc " & _
                                      "From Acc Where Acc1=N'Fixed Assets' and Acc2 Is Not Null and Acc3 Is Not Null " & _
                                      "and Acc4 Is Null", cnn)
            Dim Reader As SqlDataReader

            Me.GridDepreciation.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridDepreciation.Rows.Add(New String() {Reader.Item(0), Reader.Item(1), CDbl(Reader.Item(2)).ToString("N2"), _
                                                           CDbl(Reader.Item(3)).ToString("N2") * (-1), Reader.Item(4), 0})
            End While
            cnn.Close()

            Calculate()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub Calculate()
        Try
            For Each row As DataGridViewRow In Me.GridDepreciation.Rows
                If row.Cells(4).Value.ToString.Length = 0 Then
                    row.Cells(4).Value = 0
                End If
                Try
                    row.Cells(5).Value = CDbl(CDbl(row.Cells(2).Value) * CDbl(row.Cells(4).Value) / 100).ToString("N2")
                Catch ex As Exception
                    row.Cells(5).Value = "0.00"
                End Try
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Try
            If Me.CombAssetsGroup.SelectedIndex = -1 Then
                MsgBox("Please asset's group")
            ElseIf Me.txtAssetName.Text.Trim.Length = 0 Then
                MsgBox("Please enter asset's name")
            Else
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Transaction = Trans
                cmd.Connection = cnn


                cmd.CommandText = "Insert Into Acc (Acc1,Acc2,Acc3,DeprPerc) Values " & _
                                  "(N'Fixed Assets',N'" & Me.CombAssetsGroup.SelectedItem & "',N'" & Me.txtAssetName.Text.Trim & "',N'" & Me.txtDeprPerc.Value & "')"
                cmd.ExecuteNonQuery()

                cmd.CommandText = "Insert Into Acc (Acc1,Acc2,Acc3,Acc4) Values " & _
                                  "(N'Fixed Assets',N'" & Me.CombAssetsGroup.SelectedItem & "',N'" & Me.txtAssetName.Text & "',N'Value')"
                cmd.ExecuteNonQuery()

                cmd.CommandText = "Insert Into Acc (Acc1,Acc2,Acc3,Acc4) Values " & _
                                  "(N'Fixed Assets',N'" & Me.CombAssetsGroup.SelectedItem & "',N'" & Me.txtAssetName.Text & "',N'Depreciation')"
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                FillAssetsList()
                FillAssetsDepreciationList()

                Me.CombAssetsGroup.SelectedIndex = -1
                Me.txtAssetName.Clear()
                Me.txtDeprPerc.Value = 0
                Me.CombAssetsGroup.Focus()

                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmFixedAssets_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAssetsGroups()
        FillAssetsList()
        FillAssetsDepreciationList()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        FillAssetsSheet()
    End Sub
    Sub FillAssetsSheet()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim YearStartDate, CurrentDate As String
            YearStartDate = "N'1/1/" & Me.DTPAssetsSheet.Value.Year & " 00:00:01'"
            CurrentDate = "N'" & Format(Me.DTPAssetsSheet.Value, "MM/dd/yyyy") & " 23:59:59'"

            Dim cmd As New SqlCommand("Select Distinct Acc2,Acc3," & _
                                      "dbo.GetAccBalance(Acc2,Acc3,'Value'," & YearStartDate & ")," & _
                                      "dbo.GetAccMove(Acc3,'Value'," & YearStartDate & "," & CurrentDate & ")," & _
                                      "dbo.GetAccBalance(Acc2,Acc3,'Depreciation'," & YearStartDate & ")," & _
                                      "dbo.GetAccMove(Acc3,'Depreciation'," & YearStartDate & "," & CurrentDate & ")" & _
                                      "From Acc Where Acc1=N'Fixed Assets' and Acc2 Is Not Null and Acc3 Is Not Null " & _
                                      "and Acc4 Is Null", cnn)
            Dim Reader As SqlDataReader

            Me.GridAssetsSheet.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridAssetsSheet.Rows.Add(New String() {Reader.Item(0), Reader.Item(1), CDbl(Reader.Item(2)).ToString("N2"), CDbl(Reader.Item(3)).ToString("N2"), _
                                                          0, CDbl(Reader.Item(4)).ToString("N2") * (-1), CDbl(Reader.Item(5)).ToString("N2") * (-1), _
                                                          0, 0})
            End While
            cnn.Close()

            CalculateAssetsSheet()

            For Each row As DataGridViewRow In Me.GridAssetsSheet.Rows
                row.Cells(4).Style.BackColor = Color.Gainsboro
                row.Cells(7).Style.BackColor = Color.Gainsboro
                row.Cells(8).Style.BackColor = Color.LightGray
            Next

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub CalculateAssetsSheet()
        Try
            For Each row As DataGridViewRow In Me.GridAssetsSheet.Rows
                row.Cells(4).Value = CDbl(CDbl(row.Cells(2).Value) + CDbl(row.Cells(3).Value)).ToString("N2")
                row.Cells(7).Value = CDbl(CDbl(row.Cells(5).Value) + CDbl(row.Cells(6).Value)).ToString("N2")
                row.Cells(8).Value = CDbl(CDbl(row.Cells(4).Value) - CDbl(row.Cells(7).Value)).ToString("N2")
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Dim GroupName As String
            GroupName = InputBox("Please enter group name").Trim

            If GroupName.Trim.Length > 0 Then
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand
                cmd.Connection = cnn

                cnn.Open()

                cmd.CommandText = "Insert Into Acc (Acc1,Acc2) Values " & _
                                  "(N'Fixed Assets',N'" & GroupName & "')"

                cmd.ExecuteNonQuery()
                cnn.Close()

                FillAssetsGroups()

                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub FillAssetsGroups()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct Acc2 From Acc Where Acc1=N'Fixed Assets'" & _
                                      "and Acc2 Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.CombAssetsGroup.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.CombAssetsGroup.Items.Add(Reader.Item("Acc2"))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim MoveNo As Integer
            Dim cmd As New SqlCommand
            Dim Trans As SqlTransaction
            Dim Time As String

            cnn.Open()
            cmd.Connection = cnn
            Trans = cnn.BeginTransaction
            cmd.Transaction = Trans

            cmd.CommandText = "Select IsNull(Max(MoveNo),0) From Transactions"
            MoveNo = CInt(cmd.ExecuteScalar.ToString) + 1

            cmd.CommandText = "Select GetDate()"
            Time = CDate(cmd.ExecuteScalar).ToString("HH:mm:ss")


            For Each row As DataGridViewRow In Me.GridDepreciation.Rows
                If CDbl(row.Cells(5).Value) = 0 Then
                    Continue For
                Else
                    'Deprecition
                    cmd.CommandText = "Insert into Transactions (Descr,MoveNo,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName," & _
                                      "TransDate) Values (@Descr,@MoveNo,@Acc1,@Acc2,@Acc3,@Acc4,@TotalValueIn,@UserName,@TransDate)"
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@Descr", "Depreciation")
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Acc1", "Fixed Assets")
                    cmd.Parameters.AddWithValue("@Acc2", row.Cells(0).Value)
                    cmd.Parameters.AddWithValue("@Acc3", row.Cells(1).Value)
                    cmd.Parameters.AddWithValue("@Acc4", "Depreciation")
                    cmd.Parameters.AddWithValue("@TotalValueIn", row.Cells(5).Value)
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.Parameters.AddWithValue("@TransDate", Me.DTPDepreciation.Value.ToString("MM/dd/yyyy") & " " & Time)
                    cmd.ExecuteNonQuery()

                    'Expenditure
                    cmd.CommandText = "Insert into Transactions (Descr,MoveNo,Acc1,Acc2,Acc3,Acc4,TotalValueOut,UserName," & _
                                       "TransDate) Values (@Descr,@MoveNo,@Acc1,@Acc2,@Acc3,@Acc4,@TotalValueOut,@UserName,@TransDate)"
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@Descr", "Depreciation")
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Acc1", "Profit & Loss")
                    cmd.Parameters.AddWithValue("@Acc2", "Expenses")
                    cmd.Parameters.AddWithValue("@Acc3", "Depreciation Expenses")
                    cmd.Parameters.AddWithValue("@Acc4", "Depreciation Expenses")
                    cmd.Parameters.AddWithValue("@TotalValueOut", row.Cells(5).Value)
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.Parameters.AddWithValue("@TransDate", Me.DTPDepreciation.Value.ToString("MM/dd/yyyy") & " " & Time)
                    cmd.ExecuteNonQuery()
                End If
            Next
            Trans.Commit()
            cnn.Close()

            MsgBox("Saved Successfully")

            PrintVoucher(MoveNo, Me.DTPDepreciation.Value.Year)
            'RefreshData()
            FillAssetsDepreciationList()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button6.Click
        Try
            FillAssetsSheet()

            Me.Cursor = Cursors.WaitCursor

            Dim das As New DsFixedAssetsSheet

            For Each row As DataGridViewRow In Me.GridAssetsSheet.Rows
                das.Tables(0).Rows.Add(New String() {row.Cells(0).Value, row.Cells(1).Value, row.Cells(2).Value, row.Cells(3).Value, row.Cells(4).Value, row.Cells(5).Value, row.Cells(6).Value, _
                                                     row.Cells(7).Value, row.Cells(8).Value, Me.DTPAssetsSheet.Value})
            Next

            'Pass to crystal reports

            Dim rpt As New FixedAssetsSummery

            rpt.SetDataSource(das)
            ReportViewer.CrystalReportViewer2.ReportSource = rpt
            ReportViewer.CrystalReportViewer2.RefreshReport()
            ReportViewer.ShowDialog()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button7.Click
        Try
            FillAssetsSheet()

            Me.Cursor = Cursors.WaitCursor

            Dim das As New DsFixedAssetsSheet

            For Each row As DataGridViewRow In Me.GridAssetsSheet.Rows
                das.Tables(0).Rows.Add(New String() {row.Cells(0).Value, row.Cells(1).Value, row.Cells(2).Value, row.Cells(3).Value, _
                                                     row.Cells(4).Value, row.Cells(5).Value, row.Cells(6).Value, row.Cells(7).Value, row.Cells(8).Value, Me.DTPAssetsSheet.Value})
            Next

            'Pass to crystal reports

            Dim rpt As New FixedAssetsDetails

            rpt.SetDataSource(das)
            ReportViewer.CrystalReportViewer2.ReportSource = rpt
            ReportViewer.CrystalReportViewer2.RefreshReport()
            ReportViewer.ShowDialog()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub GridDepreciation_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridDepreciation.CellContentClick

    End Sub
End Class