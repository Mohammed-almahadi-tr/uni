Imports System.Data.SqlClient

Public Class frmRptIncomeCollectorDetails67

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.RAll.Checked = True Then
            Try
                Me.Cursor = Cursors.WaitCursor
                'Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند قبض' and " & _
                '                              "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                '                              "TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'", cnn1)
                Dim str As String

                Dim cmd As New SqlCommand("Select Distinct Collector From Collectors", cnn1)
                Dim Reader As SqlDataReader
                Dim CollectorsList As New ArrayList

                cnn1.Open()
                Reader = cmd.ExecuteReader

                While Reader.Read
                    str = str & "Select distinct collector,N'" & Me.DateTimePicker1.Value.ToString & _
                    "' TransDate,(SELECT sum(Tuitionfees) FROM transactions where collector=N'" & _
                           Reader.Item("Collector") & "' AND college not like '%دبلوم%' and Transtype = N'سند قبض' and " & _
                           " (TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01') and " & _
                           " (TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59'))" & _
                           " as Tuitionfees,(SELECT sum(Tuitionfees) FROM transactions where collector=N'" & _
                           Reader.Item("Collector") & "' AND college  like '%دبلوم%' and Transtype = N'سند قبض' and " & _
                           " (TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01') and " & _
                           " (TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59')) as SNo " & _
                           ",SUM(regFees) regFees,SUM(stam) stam,SUM(madicalinsh) madicalinsh,SUM(MedExamFees) MedExamFees," & _
                           " SUM(clus) clus,sum(HiEdu) HiEdu,sum(univar) univar" & _
                           " From Transactions  where Transtype = N'سند قبض' and collector=N'" & Reader.Item("Collector") & "' and " & _
                           " (TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01') and " & _
                           " (TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59') group by collector" & vbCrLf & " Union " & vbCrLf

                End While
                cnn1.Close()

                str = str.Substring(0, (str.Length) - 8)
                'MsgBox(str)
                Dim dap As New SqlDataAdapter(str, cnn1)
                Dim das As New DataSet
                das.Clear()

                cnn1.Open()
                dap.Fill(das, "Transactions")
                cnn1.Close()

                Dim rpt As New IncomeDetails67Total
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn1.State = ConnectionState.Open Then
                    cnn1.Close()
                End If
                MsgBox(ex.ToString)
            End Try

        ElseIf Me.RCollector.Checked = True Then
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند قبض' and " & _
                                              "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                                              "TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59' " & _
                                              "and Collector=N'" & Me.CombCollecter.SelectedItem & "'", cnn1)
                Dim das As New DataSet
                das.Clear()

                cnn1.Open()
                dap.Fill(das, "Transactions")
                cnn1.Close()

                Dim rpt As New IncomeDetails67
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn1.State = ConnectionState.Open Then
                    cnn1.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub frmRptIncomeCollectorDetails_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.RAll.Checked = True
        Try
            Dim CollectorsList As New ArrayList
            CollectorsList = GetCollectorsList()
            Me.CombCollecter.Items.Clear()

            For Each CollegeName As String In CollectorsList
                Me.CombCollecter.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub RAll_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RAll.CheckedChanged
        If Me.RAll.Checked = True Then
            Me.CombCollecter.Enabled = False
        ElseIf Me.RCollector.Checked = True Then
            Me.CombCollecter.Enabled = True
        End If
    End Sub
End Class